import { Permission } from '@/permission/domain/permission';
import { Role } from '@/permission/domain/role';

export const PERMISSIONS = {
  READ_SUPPORT_CONVERSATIONS: Permission.of(
    'Read Support Messages',
    'Allows user to view support messages in the inbox',
    'read_support_conversations',
  ),
  REPLY_SUPPORT_CONVERSATIONS: Permission.of(
    'Reply to Support Messages',
    'Allows user to send replies to support messages',
    'reply_support_conversations',
  ),
  MANAGE_TEAMMATES: Permission.of(
    'Add or Remove Team Members',
    'Allows user to add or remove team members',
    'manage_teammates',
  ),
  MESSAGE_TEAMMATES: Permission.of(
    'Message Team Members',
    'Allows user to send and receive internal messages with other team members',
    'message_teammates',
  ),
  MANAGE_CHANNELS: Permission.of(
    'Connect Messaging Platforms',
    'Allows user to connect supported messaging platforms, like whatsapp etc',
    'manage_channels',
  ),
  VIEW_BACKFILL_TASK: Permission.of(
    'Can See All Backfill Tasks',
    'Allows user to see all Backfill Tasks',
    'view_backfill_tasks',
  ),
  RUN_BACKFILL_TASK: Permission.of(
    'Can Trigger Run for Backfill',
    'Allows user to trigger run for Backfill',
    'run_backfill_tasks',
  ),
} as const;

export const ROLES: Record<string, Role> = {
  SuperAdmin: Role.of('SuperAdmin', [
    PERMISSIONS.READ_SUPPORT_CONVERSATIONS,
    PERMISSIONS.REPLY_SUPPORT_CONVERSATIONS,
    PERMISSIONS.MESSAGE_TEAMMATES,
    PERMISSIONS.MANAGE_TEAMMATES,
    PERMISSIONS.MANAGE_CHANNELS,
    //special permission
    PERMISSIONS.VIEW_BACKFILL_TASK,
    PERMISSIONS.RUN_BACKFILL_TASK,
  ]),
  WorkspaceAdmin: Role.of('WorkspaceAdmin', [
    PERMISSIONS.READ_SUPPORT_CONVERSATIONS,
    PERMISSIONS.REPLY_SUPPORT_CONVERSATIONS,
    PERMISSIONS.MESSAGE_TEAMMATES,
    PERMISSIONS.MANAGE_TEAMMATES,
    PERMISSIONS.MANAGE_CHANNELS,
  ]),
  SupportStaff: Role.of('SupportStaff', [
    PERMISSIONS.READ_SUPPORT_CONVERSATIONS,
    PERMISSIONS.REPLY_SUPPORT_CONVERSATIONS,
    PERMISSIONS.MESSAGE_TEAMMATES,
  ]),
  WorkspaceMember: Role.of('WorkspaceMember', [PERMISSIONS.MESSAGE_TEAMMATES]),
};

export type PermissionKey = keyof typeof PERMISSIONS;
