import {
  BadGatewayException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import { FahariPermissionService } from '@/fahari/permission/permission.service';
import { ReservedAccountService } from '@/fahari/payments/reserved-account.service';
import { ProvisionReservedAccountDto } from '@/fahari/payments/dto/provision-reserved-account.dto';
import { ProvisionReservedAccountForUserDto } from '@/fahari/payments/dto/provision-reserved-account-for-user.dto';
import {
  ReservedAccountResponseDto,
  toReservedAccountResponse,
} from '@/fahari/payments/dto/reserved-account-response.dto';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { MonnifyApiError } from '@/fahari/payments/monnify/monnify.types';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';

@Controller('fahari/admin/users')
@ApiTags('fahari-payments')
export class PaymentsAdminController {
  private readonly logger = new Logger(PaymentsAdminController.name);

  constructor(
    private readonly reservedAccountService: ReservedAccountService,
    private readonly fahariPermissionService: FahariPermissionService,
  ) {}

  @Post('reserved-account')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({
    summary: 'Create a driver and provision a Monnify reserved account',
  })
  @ApiBody({ type: ProvisionReservedAccountDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Driver created and reserved account provisioned',
    type: ReservedAccountResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'A user with this email already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Caller is not a Fahari super admin',
  })
  @ApiResponse({
    status: HttpStatus.BAD_GATEWAY,
    description: 'Monnify could not provision the reserved account',
  })
  @ApiBadRequestResponse()
  async provisionReservedAccount(
    @User() requestUser: RequestUser,
    @Body() dto: ProvisionReservedAccountDto,
  ): Promise<ReservedAccountResponseDto> {
    try {
      const reservedAccount =
        await this.fahariPermissionService.runIfSuperAdmin(
          requestUser,
          (requester) =>
            this.reservedAccountService.provisionForNewDriver(requester.id, {
              firstName: dto.firstName,
              lastName: dto.lastName,
              email: dto.email,
              bvn: dto.bvn,
              nin: dto.nin,
            }),
        );
      return toReservedAccountResponse(reservedAccount);
    } catch (error) {
      if (error instanceof ItemAlreadyExistsInDb) {
        throw new ConflictException(error.message);
      }
      if (error instanceof MonnifyApiError) {
        this.logger.error(
          `Unable to provision reserved account; responseCode=${error.responseCode}; responseMessage=${error.responseMessage}`,
        );
        throw new BadGatewayException('Unable to provision reserved account');
      }
      throw error;
    }
  }

  @Post('provision-reserved-account')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({
    summary: 'Provision a Monnify reserved account for an existing user',
  })
  @ApiBody({ type: ProvisionReservedAccountForUserDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Reserved account provisioned',
    type: ReservedAccountResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User does not exist',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Caller is not a Fahari super admin',
  })
  @ApiResponse({
    status: HttpStatus.BAD_GATEWAY,
    description: 'Monnify could not provision the reserved account',
  })
  @ApiBadRequestResponse()
  async provisionReservedAccountForUser(
    @User() requestUser: RequestUser,
    @Body() dto: ProvisionReservedAccountForUserDto,
  ): Promise<ReservedAccountResponseDto> {
    try {
      const reservedAccount =
        await this.fahariPermissionService.runIfSuperAdmin(
          requestUser,
          (requester) =>
            this.reservedAccountService.provision(requester.id, dto.userId, {
              bvn: dto.bvn,
              nin: dto.nin,
            }),
        );
      return toReservedAccountResponse(reservedAccount);
    } catch (error) {
      if (error instanceof MonnifyApiError) {
        this.logger.error(
          `Unable to provision reserved account; responseCode=${error.responseCode}; responseMessage=${error.responseMessage}`,
        );
        throw new BadGatewayException('Unable to provision reserved account');
      }
      throw error;
    }
  }
}
