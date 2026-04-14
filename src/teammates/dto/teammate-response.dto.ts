import { ApiProperty } from '@nestjs/swagger';
import { TeammateStatus } from '@/generated/prisma/enums';
import { Teammate } from '@/generated/prisma/client';

export class TeammateResponseDto {
  @ApiProperty({ description: 'Teammate Id' })
  id: number;

  @ApiProperty({ description: 'Teammate email' })
  email: string;

  @ApiProperty({ description: 'Teammate first name' })
  firstName: string;

  @ApiProperty({ description: 'Teammate last name' })
  lastName: string;

  @ApiProperty({ description: 'Teammate status', enum: TeammateStatus })
  status: TeammateStatus;

  @ApiProperty({ description: 'Teammate avatar url', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ description: 'Teammate groups', type: [String] })
  groups: string[];
}

export function toTeammateResponse(teammate: Teammate): TeammateResponseDto {
  return {
    id: teammate.id,
    email: teammate.email,
    firstName: teammate.firstName,
    lastName: teammate.lastName,
    status: teammate.status,
    avatarUrl: teammate.avatarUrl,
    groups: teammate.groups,
  };
}
