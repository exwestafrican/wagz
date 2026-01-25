import { WorkspaceStatus } from '@/generated/prisma/enums';
import { PointOfContact } from '@/workspace/domain/PointOfContact';
import { Workspace } from '@/generated/prisma/client';

export class WorkspaceDetails {
  readonly workspaceId: number;
  readonly name: string;
  readonly status: WorkspaceStatus;
  readonly code: string;
  readonly pointOfContact: PointOfContact;

  constructor(
    workspaceId: number,
    name: string,
    status: WorkspaceStatus,
    code: string,
    pointOfContact: PointOfContact,
  ) {
    this.workspaceId = workspaceId;
    this.name = name;
    this.status = status;
    this.code = code;
    this.pointOfContact = pointOfContact;
  }

  static from(workspace: Workspace, pointOfContact: PointOfContact) {
    return new WorkspaceDetails(
      workspace.id,
      workspace.name,
      workspace.status,
      workspace.code,
      pointOfContact,
    );
  }
}
