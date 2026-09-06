import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@/envoye/auth/auth.module';
import { JwtVerifierModule } from '@/jwt-verifier/jwt-verifier.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RoadmapModule } from '@/envoye/roadmap/roadmap.module';
import { WaitlistModule } from '@/envoye/waitlist/waitlist.module';
import { PermissionModule } from '@/permission/permission.module';
import { WorkspaceModule } from '@/envoye/workspace/workspace.module';
import { MessagingModule } from '@/messaging/messaging.module';
import { FeatureFlagModule } from '@/envoye/feature-flag/feature-flag.module';
import { TeammatesModule } from '@/envoye/teammates/teammates.module';
import { CommonModule } from '@/common/common.module';
import { BackfillModule } from '@/envoye/backfill/backfill.module';
import { CommandsModule } from '@/envoye/commands/commands.module';
import { CommandsModule as FahariCommandsModule } from '@/fahari/commands/commands.module';
import { AuthModule as FahariAuthModule } from '@/fahari/auth/auth.module';
import { AdminModule } from '@/envoye/admin/admin.module';
import { ConversationsModule } from '@/envoye/conversations/conversations.module';
import { TrackerModule } from '@/fahari/tracker/tracker.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available globally
    }),
    JwtVerifierModule,
    AuthModule,
    PrismaModule,
    RoadmapModule,
    WaitlistModule,
    PermissionModule,
    WorkspaceModule,
    MessagingModule,
    FeatureFlagModule,
    TeammatesModule,
    CommonModule,
    BackfillModule,
    CommandsModule,
    FahariAuthModule,
    FahariCommandsModule,
    AdminModule,
    ConversationsModule,
    TrackerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
