import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { PermissionController } from '@/fahari/permission/permission.controller';
import { FahariPermissionService } from '@/fahari/permission/permission.service';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionController],
  providers: [FahariPermissionService],
  exports: [FahariPermissionService],
})
export class FahariPermissionModule {}
