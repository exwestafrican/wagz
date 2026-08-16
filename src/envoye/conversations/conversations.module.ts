import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { PermissionModule } from '@/common/permission/permission.module';
import { TeammatesModule } from '@/envoye/teammates/teammates.module';
import EnvoyeMessenger from '@/envoye/conversations/messangers/envoye';
import { LinkService } from '@/common/link-service';
import { MessagingModule } from '@/common/messaging/messaging.module';

@Module({
  imports: [PermissionModule, TeammatesModule, MessagingModule],
  providers: [ConversationsService, EnvoyeMessenger, LinkService],
  controllers: [ConversationsController],
  exports: [ConversationsService, EnvoyeMessenger],
})
export class ConversationsModule {}
