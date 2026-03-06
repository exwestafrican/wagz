import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ROLES } from './types';
import { isEmpty } from '@/common/utils';
import { Permission } from './domain/permission';

@Injectable()
export class PermissionService {
  constructor(private readonly prismaService: PrismaService) {}

  async teammatePermissions(
    email: string,
    workspaceCode: string,
  ): Promise<Permission[]> {
    const teammate = await this.prismaService.teammate.findUniqueOrThrow({
      where: {
        workspaceCode_email: {
          workspaceCode: workspaceCode,
          email: email,
        },
      },
    });

    const roles = teammate.groups;
    if (isEmpty(roles)) {
      return Promise.resolve([]);
    }
    const teammateRole = roles[0]; //WorkspaceAdmin
    return ROLES[teammateRole].permissions;
  }
}
