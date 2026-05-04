import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FeatureFlagStatus } from '@/generated/prisma/enums';
import { UnExpectedStatusException } from '@/feature-flag/exceptions/unexpected-status.exception';
import { existsInDbError } from '@/common/error-type';

@Injectable()
export default class FeatureFlagManager {
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

  async turnOnFF(workspaceCode: string, key: string): Promise<void> {
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
        return;
      default:
        throw new UnExpectedStatusException(
          `Unexpected feature flag status for key "${key}": ${String(
            featureFlag.status,
          )}`,
        );
    }
  }

  async turnOnFFGlobally(key: string): Promise<void> {
    // TODO(activity-log): record admin action (who, what, key) when activity logging exists.
    const featureFlag = await this.prismaService.featureFlag.findFirstOrThrow({
      where: { key },
    });

    if (featureFlag.status === FeatureFlagStatus.GLOBAL) {
      return;
    }

    await this.prismaService.featureFlag.update({
      where: { id: featureFlag.id },
      data: {
        status: FeatureFlagStatus.GLOBAL,
        enabledAt: new Date(),
      },
    });
  }

  async turnOffGlobally(key: string): Promise<void> {
    // TODO(activity-log): record admin action (who, what, key) when activity logging exists.
    const featureFlag = await this.prismaService.featureFlag.findFirstOrThrow({
      where: { key },
    });

    if (featureFlag.status === FeatureFlagStatus.DISABLED) {
      return;
    }

    await this.prismaService.featureFlag.update({
      where: { id: featureFlag.id },
      data: {
        status: FeatureFlagStatus.DISABLED,
        enabledAt: null,
      },
    });
  }

  async turnOff(workspaceCode: string, key: string): Promise<void> {
    // TODO(activity-log): record admin action (who, what, key, workspaceCode) when activity logging exists.
    const featureFlag = await this.prismaService.featureFlag.findFirstOrThrow({
      where: { key },
    });

    switch (featureFlag.status) {
      case FeatureFlagStatus.GLOBAL:
        throw new BadRequestException(
          'Cannot turn off a single workspace while the feature flag is enabled globally.',
        );
      case FeatureFlagStatus.DISABLED:
        return;
      case FeatureFlagStatus.PARTIAL:
        await this.prismaService.workspaceFeature.deleteMany({
          where: {
            featureFlagId: featureFlag.id,
            workspaceCode,
          },
        });
        return;
      default:
        throw new UnExpectedStatusException(
          `Unexpected feature flag status for key "${key}": ${String(
            featureFlag.status,
          )}`,
        );
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
    return this.prismaService.featureFlag.findMany();
  }
}
