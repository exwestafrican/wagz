import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { NormalizeUsernames } from '@/backfill/tasks/normalize-username';
import { BackfillController } from './backfill.controller';
import { BackfillRegistryProvider } from '@/backfill/backfill-registry.provider';

@Module({
  imports: [PrismaModule],
  providers: [NormalizeUsernames, BackfillRegistryProvider],
  controllers: [BackfillController],
})
export class BackfillModule {}
