import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { PermissionModule } from '@/permission/permission.module';
import { TeammatesModule } from '@/teammates/teammates.module';
import EnvoyeMessenger from '@/conversations/messangers/envoye';
import { LinkService } from '@/common/link-service';
import { MessagingModule } from '@/messaging/messaging.module';

@Module({
  imports: [PermissionModule, TeammatesModule, MessagingModule],
  providers: [ConversationsService, EnvoyeMessenger, LinkService],
  controllers: [ConversationsController],
  exports: [ConversationsService, EnvoyeMessenger],
})
export class ConversationsModule {}
