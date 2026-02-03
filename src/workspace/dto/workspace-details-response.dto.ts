import { WorkspaceStatus } from '@/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceDetails } from '@/workspace/domain/workspace-details';

export default class WorkspaceDetailsResponseDto {
  @ApiProperty({ description: 'Workspace id' })
  workspaceId: number;

  @ApiProperty({ description: 'Company profile id that owns the workspace' })
  ownedByCompanyId: number;

  @ApiProperty({ description: 'Workspace name' })
  name: string;

  @ApiProperty({ description: 'Workspace status', enum: WorkspaceStatus })
  status: WorkspaceStatus;

  @ApiProperty({ description: 'Workspace invite code' })
  code: string;
}

export function toWorkspaceDetailsResponse(
  details: WorkspaceDetails,
): WorkspaceDetailsResponseDto {
  return {
    workspaceId: details.workspaceId,
    ownedByCompanyId: details.ownedByCompanyId,
    name: details.name,
    status: details.status,
    code: details.code,
  };
}
