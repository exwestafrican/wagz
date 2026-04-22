import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { NormalizeUsernames } from '@/backfill/tasks/normalize-username';

@Module({
  imports: [PrismaModule],
  providers: [NormalizeUsernames],
})
export class BackfillModule {}
