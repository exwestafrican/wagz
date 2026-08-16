import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { NormalizeUsernames } from '@/envoye/backfill/tasks/normalize-username';
import { BackfillCompanyProfilePreverification } from '@/envoye/backfill/tasks/company-profile-preverification';
import { BackfillController } from './backfill.controller';
import { BackfillRegistryProvider } from '@/envoye/backfill/backfill-registry.provider';
import { PermissionModule } from '@/common/permission/permission.module';
import { TeammatesModule } from '@/envoye/teammates/teammates.module';
import { ConversationsModule } from '@/envoye/conversations/conversations.module';

@Module({
  imports: [
    PrismaModule,
    PermissionModule,
    TeammatesModule,
    ConversationsModule,
  ],
  providers: [
    NormalizeUsernames,
    BackfillCompanyProfilePreverification,
    BackfillRegistryProvider,
  ],
  controllers: [BackfillController],
})
export class BackfillModule {}
