import { ApiProperty } from '@nestjs/swagger';
import { User } from '@/generated/prisma/client';

export class UserProfileResponseDto {
  @ApiProperty({ description: 'User first name' })
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  lastName: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User permissions', type: [String] })
  permissions: string[];
}

export function toUserProfileResponse(user: User): UserProfileResponseDto {
  return {
    firstName: user.firstname,
    lastName: user.lastname,
    email: user.email,
    permissions: [],
  };
}
