import { Module } from '@nestjs/common';
import { FahariPermissionModule } from '@/fahari/permission/permission.module';
import { UserService } from '@/fahari/user/user.service';
import { UserAdminController } from '@/fahari/user/admin/user-admin.controller';

@Module({
  imports: [FahariPermissionModule],
  providers: [UserService],
  controllers: [UserAdminController],
  exports: [UserService],
})
export class UserModule {}
