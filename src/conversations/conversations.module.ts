import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { PermissionModule } from '@/permission/permission.module';
import { TeammatesModule } from '@/teammates/teammates.module';
import EnvoyeMessenger from '@/conversations/messangers/envoye';

@Module({
  imports: [PermissionModule, TeammatesModule],
  providers: [ConversationsService, EnvoyeMessenger],
  controllers: [ConversationsController],
  exports: [ConversationsService],
})
export class ConversationsModule {}
