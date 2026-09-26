import { ApiProperty } from '@nestjs/swagger';
import { User } from '@/generated/prisma/client';

export class ChauffeurResponseDto {
  @ApiProperty({ description: 'Chauffeur user id' })
  userId: number;

  @ApiProperty({ description: 'Chauffeur first name' })
  firstName: string;

  @ApiProperty({ description: 'Chauffeur last name' })
  lastName: string;

  @ApiProperty({ description: 'Chauffeur email' })
  email: string;
}

export function toChauffeurResponse(user: User): ChauffeurResponseDto {
  return {
    userId: user.id,
    firstName: user.firstname,
    lastName: user.lastname,
    email: user.email,
  };
}
