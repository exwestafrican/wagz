import { Permission } from '@/permission/domain/permission';

export class Role {
  readonly code: string;
  readonly permissions: Permission[];

  constructor(code: string, permissions: Permission[]) {
    this.code = code;
    this.permissions = permissions;
  }

  static of(code: string, permissions: Permission[]) {
    return new Role(code, permissions);
  }
}
