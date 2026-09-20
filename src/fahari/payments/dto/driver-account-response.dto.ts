import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DriverAccount } from '@/fahari/payments/domain/driver-account';

export class DriverAccountResponseDto {
  @ApiProperty({ description: 'Driver user id' })
  userId: number;

  @ApiProperty({ description: 'Driver first name' })
  firstName: string;

  @ApiProperty({ description: 'Driver last name' })
  lastName: string;

  @ApiProperty({ description: 'Driver email' })
  email: string;

  @ApiPropertyOptional({
    description: 'Id of the active reserved account',
    nullable: true,
  })
  reservedAccountId: number | null;

  @ApiPropertyOptional({
    description: 'Account number of the active reserved account',
    nullable: true,
  })
  accountNumber: string | null;
}

export function toDriverAccountResponse(
  driverAccount: DriverAccount,
): DriverAccountResponseDto {
  return {
    userId: driverAccount.userId,
    firstName: driverAccount.firstName,
    lastName: driverAccount.lastName,
    email: driverAccount.email,
    reservedAccountId: driverAccount.reservedAccountId,
    accountNumber: driverAccount.accountNumber,
  };
}
