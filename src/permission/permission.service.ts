import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { isEmpty } from '@/common/utils';
import { RoleService } from './role/role.service';

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
}
