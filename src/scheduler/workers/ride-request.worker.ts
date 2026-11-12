import { JsonValue } from '@prisma/client/runtime/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RideRequestNotificationService } from '@/fahari/notification/email/ride-request-notification.service';
import { getClientDetailsOrThrow } from '@/fahari/booking/ride-booking/query';
import { Injectable, Logger } from '@nestjs/common';
import RideRequestParams from '@/scheduler/params/ride-request.params';
import TaskRunner from '@/scheduler/workers/task-runner';

@Injectable()
export default class RideRequestWorker implements TaskRunner {
  logger = new Logger(RideRequestWorker.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly rideRequestNotificationService: RideRequestNotificationService,
  ) {}

  async run(params: JsonValue): Promise<void> {
    const rideRequestParams = RideRequestParams.fromJsonValue(params);
    const rideRequest = await this.prismaService.rideRequest.findFirstOrThrow({
      where: {
        id: rideRequestParams.rideRequestId,
      },
    });
    const client = getClientDetailsOrThrow(rideRequestParams.experienceCode);
    await this.rideRequestNotificationService.notify(rideRequest, client);
  }
}
