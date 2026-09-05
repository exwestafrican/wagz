export type MockSupabaseClient = {
  auth: {
    signInWithOtp: jest.Mock;
    admin: {
      createUser: jest.Mock;
    };
  };
};

export function createMockSupabaseClient(): MockSupabaseClient {
  return {
    auth: {
      signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
      admin: {
        createUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'mock-user' } },
          error: null,
        }),
      },
    },
  };
}
