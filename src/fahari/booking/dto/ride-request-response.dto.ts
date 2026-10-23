import { ApiProperty } from '@nestjs/swagger';
import { RideRequest } from '@/generated/prisma/client';
import { RideRequestState } from '@/generated/prisma/enums';
import { formatMinorAmount } from '@/fahari/booking/money';

export class RideRequestResponseDto {
  @ApiProperty({ description: 'Ride request id' })
  id: number;

  @ApiProperty({ enum: RideRequestState, description: 'Ride request state' })
  state: RideRequestState;

  @ApiProperty({
    description: 'Quoted price in naira, with kobo as two decimal places.',
    example: '88245.00',
  })
  amount: string;

  @ApiProperty({ description: 'Currency code', example: 'NGN' })
  currency: string;

  @ApiProperty({ description: 'Experience code', example: 'araiye' })
  experienceCode: string;

  @ApiProperty({ description: 'Number of passengers', example: 1 })
  numberOfPassengers: number;

  @ApiProperty({ description: 'Pickup date and time' })
  pickupDateTime: Date;

  @ApiProperty({ description: 'Departure date and time' })
  departureDateTime: Date;
}

export function toRideRequestResponse(
  rideRequest: RideRequest,
): RideRequestResponseDto {
  return {
    id: rideRequest.id,
    state: rideRequest.state,
    amount: formatMinorAmount(rideRequest.minorAmount),
    currency: rideRequest.currency,
    experienceCode: rideRequest.experienceCode,
    numberOfPassengers: rideRequest.numberOfPassengers,
    pickupDateTime: rideRequest.pickupDateTime,
    departureDateTime: rideRequest.departureDateTime,
  };
}
