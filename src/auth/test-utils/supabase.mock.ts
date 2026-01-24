export interface MockSupabaseClient {
  auth: {
    signUp: jest.Mock;
    signInWithOtp: jest.Mock;
  };
}

export const createMockSupabaseClient = (): MockSupabaseClient => {
  return {
    auth: {
      signUp: jest.fn(),
      signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
    },
  };
};
