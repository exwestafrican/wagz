import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { PermissionModule } from '@/permission/permission.module';
import { TeammatesModule } from '@/teammates/teammates.module';

@Module({
  imports: [PermissionModule, TeammatesModule],
  providers: [ConversationsService],
  controllers: [ConversationsController],
  exports: [ConversationsService],
})
export class ConversationsModule {}
