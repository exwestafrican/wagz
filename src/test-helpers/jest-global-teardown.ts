import DbTestContainerManager from './db.test.container';

/**
 * Jest global teardown - runs once after all tests
 */
export default function globalTeardown() {
  console.log('⚠️  Running global teardown...');
  try {
    const containerId = process.env.TEST_CONTAINER_ID;
    if (containerId) {
      DbTestContainerManager.stopContainerById(containerId);
    } else {
      console.error('❌ TEST_CONTAINER_ID environment variable is not set');
      throw new Error('TEST_CONTAINER_ID environment variable is not set');
    }
    console.log('✅ Test container stopped 🍾');
  } catch (error) {
    console.error('❌ Failed to stop test container:', error);
    throw error;
  }
}
