import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BookingService } from '@/fahari/booking/booking.service';
import { FahariPermissionService } from '@/fahari/permission/permission.service';
import { CreateFleetBookingDto } from '@/fahari/booking/dto/create-fleet-booking.dto';
import { CreateClientPickupBookingDto } from '@/fahari/booking/dto/create-client-pickup-booking.dto';
import { BookingResponseDto } from '@/fahari/booking/dto/booking-response.dto';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import NotFoundInDb from '@/common/exceptions/not-found';

@Controller('fahari/admin/bookings')
@ApiTags('fahari-bookings')
export class BookingAdminController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly fahariPermissionService: FahariPermissionService,
  ) {}

  @Post('fleet')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a fleet booking' })
  @ApiBody({ type: CreateFleetBookingDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Fleet booking created',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assigned chauffeur does not exist',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Caller is not a Fahari super admin',
  })
  @ApiBadRequestResponse()
  @UseGuards(SupabaseAuthGuard)
  async createFleetBooking(
    @User() requestUser: RequestUser,
    @Body() createFleetBookingDto: CreateFleetBookingDto,
  ): Promise<BookingResponseDto> {
    try {
      return await this.fahariPermissionService.runIfSuperAdmin(
        requestUser,
        () => this.bookingService.createFleetBooking(createFleetBookingDto),
      );
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Post('client-pickup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a client pickup booking' })
  @ApiBody({ type: CreateClientPickupBookingDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Client pickup booking created',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assigned chauffeur does not exist',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Caller is not a Fahari super admin',
  })
  @ApiBadRequestResponse()
  @UseGuards(SupabaseAuthGuard)
  async createClientPickupBooking(
    @User() requestUser: RequestUser,
    @Body() createClientPickupBookingDto: CreateClientPickupBookingDto,
  ): Promise<BookingResponseDto> {
    try {
      return await this.fahariPermissionService.runIfSuperAdmin(
        requestUser,
        () =>
          this.bookingService.createClientPickupBooking(
            createClientPickupBookingDto,
          ),
      );
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
