export const ENVIROMENT = {
  PRODUCTION: 'prod',
  DEVELOPMENT: 'dev',
  TEST: 'test',
};

export const AuthEndpoints = {
  SIGNUP_EMAIL_ONLY: '/auth/signup/email-only',
  REQUEST_MAGIC_LINK: '/auth/magic-link/request',
  SETUP_WORKSPACE: '/workspace/setup',
  WORKSPACE_DETAILS: '/workspace',
};

export const PermissionEndpoints = {
  TEAMMATE_PERMISSIONS: '/permission',
};

export const URIPaths = {
  SIGNUP_EMAIL_ONLY: '/auth/signup/email-only',
  REQUEST_MAGIC_LINK: '/auth/magic-link/request',
  SETUP_WORKSPACE: '/workspace/setup',
  WORKSPACE_DETAILS: '/workspace',
  TEAMMATE_PERMISSIONS: '/permission',
  INVITE_TEAMMATES: '/workspace/invite-teammates',
  VERIFY_INVITE: '/workspace/verify-invite',
  ACCEPT_INVITE: '/workspace/accept-invite',
  LIST_TASKS: '/backfill/tasks',
  RUN_TASK: '/backfill/tasks/:jobId/run',
};

export const TeammatesEndpoints = {
  TEAMMATES: '/teammates',
  MY_PROFILE: '/teammates/me',
  CHECK_USERNAME: '/teammates/check-username',
  RANDOM: '',
};

export const ConversationEndpoints = {
  CREATE_CONVERSATION: '/conversations',
  /** Route builder — call with a conversation id, e.g. SEND_MESSAGE(5). */
  SEND_MESSAGE: (conversationId: number) =>
    `/conversations/${conversationId}/messages`,
};
