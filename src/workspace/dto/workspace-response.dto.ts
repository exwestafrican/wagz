import { WorkspaceStatus } from '@/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';

export interface Workspace {
  code: string;
  status: WorkspaceStatus;
  name: string;
}

export default class WorkspaceResponseDto implements Workspace {
  @ApiProperty({ description: 'Workspace invite code' })
  code: string;

  @ApiProperty({ description: 'Workspace status', enum: WorkspaceStatus })
  status: WorkspaceStatus;

  @ApiProperty({ description: 'Workspace name' })
  name: string;
}
