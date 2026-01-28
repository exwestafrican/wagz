import { WorkspaceStatus } from '@/generated/prisma/enums';
import { PointOfContact } from '@/workspace/domain/point-of-contact';
import { Workspace } from '@/generated/prisma/client';

export class WorkspaceDetails {
  readonly workspaceId: number;
  readonly ownedByCompanyId: number;
  readonly name: string;
  readonly status: WorkspaceStatus;
  readonly code: string;
  readonly pointOfContact: PointOfContact;

  constructor(
    workspaceId: number,
    name: string,
    status: WorkspaceStatus,
    code: string,
    ownedByCompanyId: number,
    pointOfContact: PointOfContact,
  ) {
    this.workspaceId = workspaceId;
    this.name = name;
    this.status = status;
    this.code = code;
    this.ownedByCompanyId = ownedByCompanyId;
    this.pointOfContact = pointOfContact;
  }

  static from(workspace: Workspace, pointOfContact: PointOfContact) {
    return new WorkspaceDetails(
      workspace.id,
      workspace.name,
      workspace.status,
      workspace.code,
      workspace.ownedById,
      pointOfContact,
    );
  }
}
