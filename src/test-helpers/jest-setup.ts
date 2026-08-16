/**
 * Jest setup file - runs before each test file
 * Use this for per-test-file setup, not global setup
 */
import DbTestContainerManager from '@/test-helpers/db.test.container';

jest.mock('@react-email/render', () => ({
  render: jest.fn().mockResolvedValue('<html>Mock Email</html>'),
}));

let dbTestContainerManager: DbTestContainerManager;

const workerId = process.env.JEST_WORKER_ID;
let containerRefCount = 0;

async function setupDBContainer(workerId: string) {
  try {
    const manager = await DbTestContainerManager.createContainerOf(workerId);
    manager.start();
    const testEnv = {
      DOCKER_DB_URL: manager.connectionUri,
      TEST_CONTAINER_ID: manager.containerId,
      NODE_ENV: 'test',
    };

    Object.assign(process.env, testEnv);

    console.log(
      `✅ Worker ${workerId} database ready: ${testEnv.DOCKER_DB_URL}`,
    );
    return manager;
  } catch (error) {
    console.error('❌ Failed to start test container:', error);
    throw error;
  }
}

beforeAll(async () => {
  // create db for worker process
  if (!workerId) {
    throw new Error('JEST_WORKER_ID is not set');
  }

  if (!dbTestContainerManager) {
    dbTestContainerManager = await setupDBContainer(workerId);
  }

  containerRefCount++;
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  containerRefCount--;

  // Stop container only when all test files in worker are done
  if (containerRefCount === 0 && dbTestContainerManager) {
    try {
      await dbTestContainerManager.stop();
      console.log(`🍾 Worker ${workerId} database stopped`);
    } catch (error) {
      console.warn(`⚠️  Worker ${workerId}: Error stopping container:`, error);
    }
  }
});
