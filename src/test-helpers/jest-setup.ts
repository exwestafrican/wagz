/**
 * Jest setup file - runs before each test file
 * Use this for per-test-file setup, not global setup
 */

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
