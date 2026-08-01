import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { NormalizeUsernames } from '@/backfill/tasks/normalize-username';
import { BackfillController } from './backfill.controller';
import { BackfillRegistryProvider } from '@/backfill/backfill-registry.provider';
import { PermissionModule } from '@/permission/permission.module';
import { TeammatesModule } from '@/teammates/teammates.module';
import { ConversationsModule } from '@/conversations/conversations.module';

@Module({
  imports: [
    PrismaModule,
    PermissionModule,
    TeammatesModule,
    ConversationsModule,
  ],
  providers: [NormalizeUsernames, BackfillRegistryProvider],
  controllers: [BackfillController],
})
export class BackfillModule {}
