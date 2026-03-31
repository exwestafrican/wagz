import { Module } from '@nestjs/common';
import { TeammatesService } from './teammates.service';
import { TeammatesController } from './teammates.controller';

@Module({
  providers: [TeammatesService],
  controllers: [TeammatesController],
})
export class TeammatesModule {}
