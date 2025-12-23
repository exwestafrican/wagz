
import DbTestContainerManager from './db.test.container';
import { config } from 'dotenv';
import { resolve } from 'path';
import dotenv from 'dotenv';


/**
 * Jest global setup - runs once before all tests
 */
export default async function globalSetup() {
  console.log('🚀 Starting test container...');

  try {
    const containerManager = await DbTestContainerManager.createContainer();
    await containerManager.start()

    // put all test environment variables in an object so we can assign them to process.env
    const testEnv = {
      DOCKER_DB_URL: containerManager.connectionUri,
      TEST_CONTAINER_ID: containerManager.containerId,
      NODE_ENV: 'test',
    };

    Object.assign(process.env,testEnv); // Because of Jest module isolation, we need to temporarily set the environment variables in the global setup so they are available in the teardown and tests

    console.log('✅ Test container started with connection:', containerManager.connectionUri);
  } catch(error){
    console.error('❌ Failed to start test container:', error);
    throw error;
  }
}
