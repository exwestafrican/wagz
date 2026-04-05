import { PrismaService } from '@/prisma/prisma.service';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { isEmpty } from '@/common/utils';
import { RoleService } from './role/role.service';
import RequestUser from '@/auth/domain/request-user';
import { Teammate } from '@/generated/prisma/client';
import { Permission } from '@/permission/domain/permission';

@Injectable()
export class PermissionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly roleService: RoleService,
  ) {}

  async teammatePermissions(
    email: string,
    workspaceCode: string,
  ): Promise<string[]> {
    const teammate = await this.prismaService.teammate.findUniqueOrThrow({
      where: {
        workspaceCode_email: {
          workspaceCode: workspaceCode,
          email: email,
        },
      },
    });

    const roleCodes = teammate.groups;
    if (isEmpty(roleCodes)) {
      return Promise.resolve([]);
    }
    const permissions = roleCodes.flatMap((roleCode) =>
      this.roleService.permissions(roleCode),
    );
    const permissionCodes = permissions.map((permission) => permission.code);

    return Array.from(new Set(permissionCodes));
  }

  async runIfPermitted<T>(
    requestUser: RequestUser,
    workspaceCode: string,
    requiredPermission: Permission,
    authorizedAction: (teammate: Teammate) => T,
  ): Promise<T> {
    const teammate = await this.prismaService.teammate.findUniqueOrThrow({
      where: {
        workspaceCode_email: {
          workspaceCode: workspaceCode,
          email: requestUser.email,
        },
      },
    });

    const roleCodes = teammate.groups;
    if (this.roleService.hasPermission(roleCodes, requiredPermission)) {
      return authorizedAction(teammate);
    } else {
      throw new ForbiddenException();
    }
  }
}
