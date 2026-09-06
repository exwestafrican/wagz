import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { FahariPermissionService } from '@/fahari/permission/permission.service';

@Module({
  imports: [PrismaModule],
  providers: [FahariPermissionService],
  exports: [FahariPermissionService],
})
export class FahariPermissionModule {}
