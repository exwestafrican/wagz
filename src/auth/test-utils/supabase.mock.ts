export interface MockSupabaseClient {
  auth: {
    signUp: jest.Mock;
  };
}

export const createMockSupabaseClient = (): MockSupabaseClient => {
  return {
    auth: {
      signUp: jest.fn(),
    },
  };
};
