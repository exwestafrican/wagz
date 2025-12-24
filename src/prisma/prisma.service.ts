import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

// import { PrismaClient } from '../../generated/prisma;
// import { PrismaClient } from '../generated/prisma';
import { PrismaClient } from "@prisma/client";


@Injectable()
export class PrismaService
  extends PrismaClient
  // implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.get<string>('DOCKER_DB_URL', ''),
    });
    super({ adapter });
  }

  // async onModuleInit() {
  //   await this.$connect();
  // }

  // async onModuleDestroy() {
  //   await this.$disconnect();
  // }
}
