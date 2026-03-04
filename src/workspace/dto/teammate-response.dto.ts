import { Teammate } from '@/generated/prisma/client';
import { TeammateStatus } from '@/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';

export default class TeammateResponseDto {
  @ApiProperty({ description: 'id of the teammate' })
  teammateId: number;

  @ApiProperty({ description: 'Teammates email', example: 'johndoe@waggz.co' })
  email: string;

  @ApiProperty({ description: 'Teammates firstname', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Teammates lastname', example: 'Doe' })
  lastName: string;

  @ApiProperty({ description: 'Teammates status', example: 'active' })
  status: TeammateStatus;

  @ApiProperty({ description: 'Teammate avatarUrl' })
  avatarUrl: string | null;

  @ApiProperty({ description: 'Teammate groups' })
  groups: string[];
}

export function toTeammatesResponse(teammate: Teammate): TeammateResponseDto {
  return {
    teammateId: teammate.id,
    email: teammate.email,
    firstName: teammate.firstName,
    lastName: teammate.lastName,
    status: teammate.status,
    avatarUrl: teammate.avatarUrl,
    groups: teammate.groups,
  };
}
