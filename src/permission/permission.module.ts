import { Module } from '@nestjs/common';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { RoleService } from './role/role.service';

@Module({
  controllers: [PermissionController],
  providers: [PermissionService, RoleService],
})
export class PermissionModule {}
