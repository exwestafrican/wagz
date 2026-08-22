import { Module } from '@nestjs/common';
import { TeammatesService } from './teammates.service';
import { TeammatesController } from './teammates.controller';
import { PermissionModule } from '@/permission/permission.module';

@Module({
  imports: [PermissionModule],
  providers: [TeammatesService],
  controllers: [TeammatesController],
  exports: [TeammatesService],
})
export class TeammatesModule {}
