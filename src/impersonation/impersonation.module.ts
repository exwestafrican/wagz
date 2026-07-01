import { Global, Module } from '@nestjs/common';
import { ImpersonationService } from './impersonation.service';
import { PermissionModule } from '@/permission/permission.module';

@Global()
@Module({
  imports: [PermissionModule],
  providers: [ImpersonationService],
  exports: [ImpersonationService],
})
export class ImpersonationModule {}
