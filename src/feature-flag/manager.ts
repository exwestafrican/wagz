import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { FeatureFlag, Workspace } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { FeatureFlagStatus } from '@/generated/prisma/enums';
import { UnExpectedStatusException } from '@/feature-flag/exceptions/unexpected-status.exception';
import { existsInDbError, notInDbError } from '@/common/error-type';
import NotFoundInDb from '@/common/exceptions/not-found';
import { ConcurrentLimit } from '@/common/concurrent-runner';

@Injectable()
export default class FeatureFlagManager {
  private static readonly ENABLE_FF_FOR_APPS_CONCURRENCY = 4;
  private static readonly APPS_WITH_FEATURE_ENABLED_LIMIT = 100;

  constructor(private readonly prismaService: PrismaService) {}

  async create(
    key: string,
    name: string,
    description: string,
    addedBy: string,
  ) {
    try {
      return await this.prismaService.featureFlag.create({
        data: {
          key,
          name,
          description,
          addedBy,
          status: FeatureFlagStatus.DISABLED,
        },
      });
    } catch (e) {
      if (existsInDbError(e)) {
        throw new ConflictException(
          `Feature flag with key already exists; key=${key}`,
        );
      }
      throw e;
    }
  }

  async enabled(workspaceCode: string, key: string) {
    const featureFlag = await this.prismaService.featureFlag.findFirstOrThrow({
      where: { key: key },
    });
    switch (featureFlag.status) {
      case FeatureFlagStatus.GLOBAL:
        return true;
      case FeatureFlagStatus.DISABLED:
        return false;
      case FeatureFlagStatus.PARTIAL: {
        const workspaceFeature =
          await this.prismaService.workspaceFeature.findFirst({
            where: {
              featureFlagId: featureFlag.id,
              workspaceCode: workspaceCode,
            },
          });
        return !!workspaceFeature; // return true if we found it else false
      }
      default:
        throw new UnExpectedStatusException(
          `Unexpected feature flag status for key "${key}": ${String(
            featureFlag.status,
          )}`,
        );
    }
  }

  async enableFF(workspaceCode: string, key: string): Promise<FeatureFlag> {
    // TODO(activity-log): record admin action (who, what, key, workspaceCode) when activity logging exists.
    const featureFlag = await this.prismaService.featureFlag.findFirstOrThrow({
      where: { key },
    });

    switch (featureFlag.status) {
      case FeatureFlagStatus.GLOBAL:
        throw new BadRequestException(
          'Cannot enable a globally enabled feature flag for a single workspace.',
        );
      case FeatureFlagStatus.DISABLED:
        throw new BadRequestException(
          'Cannot enable a disabled feature flag for a single workspace. Set it to PARTIAL first.',
        );
      case FeatureFlagStatus.PARTIAL:
        await this.createWorkspaceFeatureIfMissing({
          featureFlagId: featureFlag.id,
          workspaceCode,
        });
        return featureFlag;
      default:
        throw new UnExpectedStatusException(
          `Unexpected feature flag status for key "${key}": ${String(
            featureFlag.status,
          )}`,
        );
    }
  }

  async enableFFForApps(key: string, appCodes: string[]): Promise<void> {
    const workspaces = await this.prismaService.workspace.findMany({
      where: { code: { in: appCodes } },
      select: { code: true },
    });

    const limit = ConcurrentLimit(
      FeatureFlagManager.ENABLE_FF_FOR_APPS_CONCURRENCY,
      workspaces.length,
    );

    const tasks = workspaces.map((workspace) =>
      limit.run(() => this.enableFF(workspace.code, key)),
    );

    try {
      await Promise.all(tasks);
    } catch (error) {
      if (notInDbError(error)) {
        throw new NotFoundInDb(`Feature flag not found; key=${key}`);
      }
      throw error;
    }
  }

  async turnOnFFGlobally(key: string): Promise<FeatureFlag> {
    // TODO(activity-log): record admin action (who, what, key) when activity logging exists.
    const featureFlag = await this.prismaService.featureFlag.findFirstOrThrow({
      where: { key },
    });

    return this.prismaService.featureFlag.update({
      where: { id: featureFlag.id },
      data: {
        status: FeatureFlagStatus.GLOBAL,
        enabledAt: new Date(),
      },
    });
  }

  async turnOffGlobally(key: string): Promise<FeatureFlag> {
    // TODO(activity-log): record admin action (who, what, key) when activity logging exists.
    const featureFlag = await this.prismaService.featureFlag.findFirstOrThrow({
      where: { key },
    });

    return this.prismaService.featureFlag.update({
      where: { id: featureFlag.id },
      data: {
        status: FeatureFlagStatus.DISABLED,
        enabledAt: null,
      },
    });
  }

  async turnOnPartial(key: string): Promise<FeatureFlag> {
    // TODO(activity-log): record admin action (who, what, key) when activity logging exists.
    const featureFlag = await this.prismaService.featureFlag.findFirstOrThrow({
      where: { key },
    });

    return this.prismaService.featureFlag.update({
      where: { id: featureFlag.id },
      data: {
        status: FeatureFlagStatus.PARTIAL,
      },
    });
  }

  async setStatus(
    key: string,
    status: FeatureFlagStatus,
  ): Promise<FeatureFlag> {
    try {
      switch (status) {
        case FeatureFlagStatus.GLOBAL:
          return await this.turnOnFFGlobally(key);
        case FeatureFlagStatus.DISABLED:
          return await this.turnOffGlobally(key);
        case FeatureFlagStatus.PARTIAL:
          return await this.turnOnPartial(key);
        default:
          throw new UnExpectedStatusException(
            `Unexpected target status for key "${key}": ${String(status)}`,
          );
      }
    } catch (error) {
      if (notInDbError(error)) {
        throw new NotFoundInDb(`Feature flag not found; key=${key}`);
      }
      throw error;
    }
  }

  async disableFF(workspaceCode: string, key: string): Promise<FeatureFlag> {
    // TODO(activity-log): record admin action (who, what, key, workspaceCode) when activity logging exists.
    const featureFlag = await this.prismaService.featureFlag.findFirstOrThrow({
      where: { key },
    });

    if (featureFlag.status == FeatureFlagStatus.GLOBAL) {
      throw new BadRequestException(
        'Cannot turn off a single workspace while the feature flag is enabled globally.',
      );
    } else {
      await this.prismaService.workspaceFeature.deleteMany({
        where: {
          featureFlagId: featureFlag.id,
          workspaceCode,
        },
      });
      return featureFlag;
    }
  }

  private async createWorkspaceFeatureIfMissing(args: {
    featureFlagId: number;
    workspaceCode: string;
  }): Promise<void> {
    try {
      await this.prismaService.workspaceFeature.create({
        data: {
          featureFlagId: args.featureFlagId,
          workspaceCode: args.workspaceCode,
        },
      });
    } catch (e) {
      if (existsInDbError(e)) {
        return;
      }
      throw e;
    }
  }

  async enabledFFs(workspaceCode: string) {
    const workspaceFeatureFlags =
      await this.prismaService.workspaceFeature.findMany({
        where: {
          workspaceCode: workspaceCode,
        },
      });

    const featureFlags = await this.prismaService.featureFlag.findMany({
      where: {
        OR: [
          { status: FeatureFlagStatus.GLOBAL },
          {
            id: {
              in: workspaceFeatureFlags.map((ff) => ff.featureFlagId), // your array of IDs
            },
          },
        ],
      },
    });

    return [...new Set(featureFlags.map((ff) => ff.key))];
  }

  async listAll() {
    return this.prismaService.featureFlag.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async listAppEnrollment(
    key: string,
  ): Promise<{ workspace: Workspace; hasFeature: boolean }[]> {
    try {
      const featureFlag = await this.prismaService.featureFlag.findFirstOrThrow(
        {
          where: { key },
        },
      );

      const workspaces = await this.prismaService.workspace.findMany({
        take: FeatureFlagManager.APPS_WITH_FEATURE_ENABLED_LIMIT,
        orderBy: { id: 'asc' },
      });

      switch (featureFlag.status) {
        case FeatureFlagStatus.DISABLED:
          return workspaces.map((workspace) => ({
            workspace,
            hasFeature: false,
          }));
        case FeatureFlagStatus.GLOBAL:
          return workspaces.map((workspace) => ({
            workspace,
            hasFeature: true,
          }));
        case FeatureFlagStatus.PARTIAL: {
          const enrolledWorkspaceCodes = new Set(
            (
              await this.prismaService.workspaceFeature.findMany({
                where: {
                  featureFlagId: featureFlag.id,
                  workspaceCode: {
                    in: workspaces.map((workspace) => workspace.code),
                  },
                },
                select: { workspaceCode: true },
              })
            ).map((workspaceFeature) => workspaceFeature.workspaceCode),
          );

          return workspaces.map((workspace) => ({
            workspace,
            hasFeature: enrolledWorkspaceCodes.has(workspace.code),
          }));
        }
        default:
          throw new UnExpectedStatusException(
            `Unexpected feature flag status for key "${key}": ${String(
              featureFlag.status,
            )}`,
          );
      }
    } catch (error) {
      if (notInDbError(error)) {
        throw new NotFoundInDb(`Feature flag not found; key=${key}`);
      }
      throw error;
    }
  }

  async appsWithFeatureEnabled(key: string): Promise<Workspace[]> {
    try {
      const featureFlag = await this.prismaService.featureFlag.findFirstOrThrow(
        {
          where: { key },
        },
      );

      switch (featureFlag.status) {
        case FeatureFlagStatus.DISABLED:
          return [];
        case FeatureFlagStatus.GLOBAL:
          return this.prismaService.workspace.findMany({
            take: FeatureFlagManager.APPS_WITH_FEATURE_ENABLED_LIMIT,
            orderBy: { id: 'asc' },
          });
        case FeatureFlagStatus.PARTIAL:
          return this.prismaService.workspace.findMany({
            where: {
              workspaceFeatures: {
                some: { featureFlagId: featureFlag.id },
              },
            },
            take: FeatureFlagManager.APPS_WITH_FEATURE_ENABLED_LIMIT,
            orderBy: { id: 'asc' },
          });
        default:
          throw new UnExpectedStatusException(
            `Unexpected feature flag status for key "${key}": ${String(
              featureFlag.status,
            )}`,
          );
      }
    } catch (error) {
      if (notInDbError(error)) {
        throw new NotFoundInDb(`Feature flag not found; key=${key}`);
      }
      throw error;
    }
  }

  async delete(key: string): Promise<FeatureFlag> {
    try {
      return await this.prismaService.featureFlag.delete({ where: { key } });
    } catch (error) {
      if (notInDbError(error)) {
        throw new NotFoundInDb(`Feature flag not found; key=${key}`);
      }
      throw error;
    }
  }
}
