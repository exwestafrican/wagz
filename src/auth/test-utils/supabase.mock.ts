export interface MockSupabaseClient {
  auth: {
    signUp: jest.Mock;
    signInWithOtp: jest.Mock;
    admin: {
      createUser: jest.Mock;
    };
  };
}

export const createMockSupabaseClient = (): MockSupabaseClient => {
  return {
    auth: {
      signUp: jest.fn(),
      signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
      admin: {
        createUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'mock-user' } }, error: null }),
      },
    },
  };
};
