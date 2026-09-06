import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Booking,
  BookingAssignment,
  ClientPickupDetail,
} from '@/generated/prisma/client';
import {
  BookingReason,
  BookingState,
  BookingType,
} from '@/generated/prisma/enums';

export type BookingWithDetails = Booking & {
  assignments: BookingAssignment[];
  clientPickupDetail: ClientPickupDetail | null;
};

export class BookingAssignmentResponseDto {
  @ApiProperty({ description: 'Assignment id' })
  id: number;

  @ApiProperty({ description: 'Booking id' })
  bookingId: number;

  @ApiProperty({ description: 'Assigned chauffeur user id' })
  userId: number;

  @ApiProperty({ description: 'User id of the admin who made this assignment' })
  assignedById: number;

  @ApiProperty({ description: 'When this assignment was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When this assignment was last updated' })
  updatedAt: Date;
}

export class ClientPickupDetailResponseDto {
  @ApiProperty({ description: 'Client pickup detail id' })
  id: number;

  @ApiProperty({ description: 'Booking id' })
  bookingId: number;

  @ApiProperty({ description: 'Client first name' })
  firstName: string;

  @ApiPropertyOptional({ description: 'Client last name' })
  lastName: string | null;

  @ApiProperty({ description: 'Pickup location' })
  pickupLocation: string;

  @ApiProperty({ description: 'Map URL for the pickup location' })
  locationUrl: string;
}

export class BookingResponseDto {
  @ApiProperty({ description: 'Booking id' })
  id: number;

  @ApiProperty({ description: 'Current chauffeur user id' })
  userId: number;

  @ApiProperty({ description: 'Calendar date of the booking' })
  date: Date;

  @ApiProperty({ description: 'Start time of the booking' })
  startTime: Date;

  @ApiPropertyOptional({ description: 'End time of the booking' })
  endTime: Date | null;

  @ApiProperty({ enum: BookingState, description: 'Booking state' })
  state: BookingState;

  @ApiPropertyOptional({ enum: BookingReason, description: 'Booking reason' })
  reason: BookingReason | null;

  @ApiProperty({ enum: BookingType, description: 'Booking type' })
  type: BookingType;

  @ApiPropertyOptional({ description: 'Optional booking note' })
  note: string | null;

  @ApiPropertyOptional({ description: 'When the booking was confirmed' })
  confirmedAt: Date | null;

  @ApiPropertyOptional({ description: 'When the booking was cancelled' })
  cancelledAt: Date | null;

  @ApiProperty({ description: 'When the booking was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the booking was last updated' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Assignment history, including the initial chauffeur',
    type: [BookingAssignmentResponseDto],
  })
  assignments: BookingAssignmentResponseDto[];

  @ApiPropertyOptional({
    description: 'Client pickup details when type is CLIENT',
    type: ClientPickupDetailResponseDto,
  })
  clientPickupDetail: ClientPickupDetailResponseDto | null;
}

function toAssignmentResponse(
  assignment: BookingAssignment,
): BookingAssignmentResponseDto {
  return {
    id: assignment.id,
    bookingId: assignment.bookingId,
    userId: assignment.userId,
    assignedById: assignment.assignedById,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}

function toClientPickupDetailResponse(
  clientPickupDetail: ClientPickupDetail,
): ClientPickupDetailResponseDto {
  return {
    id: clientPickupDetail.id,
    bookingId: clientPickupDetail.bookingId,
    firstName: clientPickupDetail.firstName,
    lastName: clientPickupDetail.lastName,
    pickupLocation: clientPickupDetail.pickupLocation,
    locationUrl: clientPickupDetail.locationUrl,
  };
}

export function toBookingResponse(
  booking: BookingWithDetails,
): BookingResponseDto {
  return {
    id: booking.id,
    userId: booking.userId,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    state: booking.state,
    reason: booking.reason,
    type: booking.type,
    note: booking.note,
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    assignments: booking.assignments.map(toAssignmentResponse),
    clientPickupDetail: booking.clientPickupDetail
      ? toClientPickupDetailResponse(booking.clientPickupDetail)
      : null,
  };
}
