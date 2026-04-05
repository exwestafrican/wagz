import { Injectable } from '@nestjs/common';
import { Role } from '../domain/role';
import { Permission } from '../domain/permission';
import { ROLES } from '../types';

@Injectable()
export class RoleService {
  fetchRole(roleCode: string): Role | undefined {
    const roles = this.fetchRoles();
    return roles[roleCode];
  }

  fetchRoles(): Record<string, Role> {
    return ROLES;
  }

  permissions(roleCode: string): Permission[] {
    const role = this.fetchRole(roleCode);
    if (!role) {
      return [];
    }
    return role.permissions;
  }

  hasPermission(roleCodes: string[], permission: Permission) {
    const permissions = roleCodes.flatMap((code) => this.permissions(code));
    return permissions.includes(permission);
  }
}
