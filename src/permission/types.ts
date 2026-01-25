import { Permission } from '@/permission/domain/permission';
import { Role } from '@/permission/domain/role';

export const PERMISSIONS = {
  READ_SUPPORT_CONVERSATIONS: Permission.of(
    'Read Support Messages',
    'Allows user viewing support messages in the inbox',
    'read_support_messages',
  ),
  REPLY_SUPPORT_CONVERSATIONS: Permission.of(
    'Reply to Support Messages',
    'Allows user send replies to support messages',
    'reply_support_messages',
  ),
  MANAGE_TEAMMATES: Permission.of(
    'Add or Remove Team Members',
    'Allows user add or Remove Team Members',
    'manage_teammates',
  ),
  MANAGE_CHANNELS: Permission.of(
    'Connect Messaging Platforms',
    'Allows user connect supported messaging platforms, like whatsapp etc',
    'manage_channels',
  ),
} as const;

export const ROLES = {
  WorkspaceAdmin: Role.of('WorkspaceAdmin', [
    PERMISSIONS.READ_SUPPORT_CONVERSATIONS,
    PERMISSIONS.REPLY_SUPPORT_CONVERSATIONS,
    PERMISSIONS.MANAGE_TEAMMATES,
    PERMISSIONS.MANAGE_CHANNELS,
  ]),
  SupportStaff: Role.of('SupportStaff', [
    PERMISSIONS.READ_SUPPORT_CONVERSATIONS,
    PERMISSIONS.REPLY_SUPPORT_CONVERSATIONS,
  ]),
};

export type PermissionKey = keyof typeof PERMISSIONS;
