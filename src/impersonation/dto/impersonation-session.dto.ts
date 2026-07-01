import { ApiProperty } from '@nestjs/swagger';
import { TeammateResponseDto } from '@/teammates/dto/teammate-response.dto';
import { ImpersonationSession } from '@/generated/prisma/client';
import { Teammate } from '@/generated/prisma/client';
import { toTeammateResponse } from '@/teammates/dto/teammate-response.dto';

export class ImpersonationSessionDto {
  @ApiProperty({ description: 'Impersonation session id' })
  sessionId: string;

  @ApiProperty({ description: 'When the session expires' })
  expiresAt: Date;

  @ApiProperty({ description: 'Teammate being impersonated', type: TeammateResponseDto })
  subject: TeammateResponseDto;
}

export function toImpersonationSessionDto(
  session: ImpersonationSession,
  subjectTeammate: Teammate,
): ImpersonationSessionDto {
  return {
    sessionId: session.id,
    expiresAt: session.expiresAt,
    subject: toTeammateResponse(subjectTeammate),
  };
}
