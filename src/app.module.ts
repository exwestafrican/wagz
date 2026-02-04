import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { JwtVerifierModule } from './jwt-verifier/jwt-verifier.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoadmapModule } from './roadmap/roadmap.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { PermissionModule } from './permission/permission.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { MessagingModule } from './messaging/messaging.module';
import { FeatureFlagModule } from './feature-flag/feature-flag.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
