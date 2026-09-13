import {
  BadGatewayException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
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
import {
  ReservedAccountResponseDto,
  toReservedAccountResponse,
} from '@/fahari/payments/dto/reserved-account-response.dto';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { MonnifyApiError } from '@/fahari/payments/monnify/monnify.types';

@Controller('fahari/admin/users')
@ApiTags('fahari-payments')
export class PaymentsAdminController {
  private readonly logger = new Logger(PaymentsAdminController.name);

  constructor(
    private readonly reservedAccountService: ReservedAccountService,
    private readonly fahariPermissionService: FahariPermissionService,
  ) {}

  @Post('reserved-account')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({
    summary: 'Provision a Monnify reserved account for a driver',
  })
  @ApiBody({ type: ProvisionReservedAccountDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Reserved account provisioned or existing active account returned',
    type: ReservedAccountResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Driver user not found',
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
            this.reservedAccountService.provisionForUser({
              requestedBy: requester.id,
              ownerId: dto.userId,
              bvn: dto.bvn,
              nin: dto.nin,
            }),
        );
      return toReservedAccountResponse(reservedAccount);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof MonnifyApiError) {
        this.logger.error(
          `Unable to provision reserved account for user: ${dto.userId}; responseCode=${error.responseCode}; responseMessage=${error.responseMessage}`,
        );
        throw new BadGatewayException('Unable to provision reserved account');
      }
      throw error;
    }
  }
}
