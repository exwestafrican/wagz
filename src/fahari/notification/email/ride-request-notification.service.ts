import { Inject, Injectable, Logger } from '@nestjs/common';
import { render } from '@react-email/render';
import React from 'react';
import { EMAIL_CLIENT, type EmailClient } from '@/messaging/email/email-client';
import { RideRequestReceivedTemplate } from '@/emails/templates/fahari/ride-request-received-template';
import { BOOKINGS_EMAIL } from '@/fahari/const';
import type { ChauffeurClient } from '@/fahari/booking/ride-booking/ride-booking.config';
import { formatMinorAmount } from '@/fahari/booking/money';
import type { RideRequest } from '@/generated/prisma/client';

@Injectable()
export class RideRequestNotificationService {
  private readonly logger = new Logger(RideRequestNotificationService.name);

  constructor(
    @Inject(EMAIL_CLIENT) private readonly emailClient: EmailClient,
  ) {}

  async notify(
    rideRequest: RideRequest,
    client: ChauffeurClient,
  ): Promise<void> {
    const emailHtml = await render(
      React.createElement(RideRequestReceivedTemplate, {
        requestId: rideRequest.id,
        experienceName: client.name,
        guestName: `${rideRequest.firstName} ${rideRequest.lastName}`,
        guestEmail: rideRequest.email,
        guestPhone: `${rideRequest.countryCallingCode} ${rideRequest.nationalNumber}`,
        pickupLocation: rideRequest.pickupLocation,
        nearestLandmark: rideRequest.nearestLandmark,
        pickupDateTime: formatRideDateTime(rideRequest.pickupDateTime),
        departureDateTime: formatRideDateTime(rideRequest.departureDateTime),
        numberOfPassengers: rideRequest.numberOfPassengers,
        amount: formatMinorAmount(rideRequest.minorAmount),
        currency: rideRequest.currency,
      }),
    );

    await this.emailClient.send({
      from: { email: BOOKINGS_EMAIL, name: 'Fahari Bookings' },
      to: {
        email: client.notificationEmail,
        name: client.name,
      },
      subject: `New ride request: ${client.name}`,
      html: emailHtml,
    });

    this.logger.log(
      `Ride request email sent for ride request id=${rideRequest.id}`,
    );
  }
}

function formatRideDateTime(date: Date): string {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${formatted} WAT`;
}
