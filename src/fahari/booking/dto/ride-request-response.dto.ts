import { ApiProperty } from '@nestjs/swagger';
import { RideRequest } from '@/generated/prisma/client';
import { RideRequestState } from '@/generated/prisma/enums';

export class RideRequestResponseDto {
  @ApiProperty({ description: 'Ride request id' })
  id: number;

  @ApiProperty({ enum: RideRequestState, description: 'Ride request state' })
  state: RideRequestState;

  @ApiProperty({
    description: 'Quoted price in minor units. Kobo for NGN, cents for USD.',
    example: 8_824_500,
  })
  minorAmount: number;

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
    minorAmount: rideRequest.minorAmount,
    currency: rideRequest.currency,
    experienceCode: rideRequest.experienceCode,
    numberOfPassengers: rideRequest.numberOfPassengers,
    pickupDateTime: rideRequest.pickupDateTime,
    departureDateTime: rideRequest.departureDateTime,
  };
}
