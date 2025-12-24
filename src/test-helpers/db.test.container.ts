import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { execSync } from 'child_process';

export default class DbTestContainerManager {
  private dbContainer: StartedPostgreSqlContainer;
  private static instance: DbTestContainerManager | null = null;

  private constructor(dbContainer: StartedPostgreSqlContainer) {
    this.dbContainer = dbContainer;
  }

  static async createContainer(): Promise<DbTestContainerManager> {
    if (this.instance) {
      return this.instance;
    } else {
      const dbContainer = await new PostgreSqlContainer('postgres:17-alpine')
        .withDatabase('envoyeTestDb')
        .withUsername('prismaTestUser')
        .withPassword('password')
        .withExposedPorts(5432)
        .start();
      console.log(
        '🚀 Test container started with connection:',
        dbContainer.getConnectionUri(),
      );

      this.instance = new DbTestContainerManager(dbContainer);
      return this.instance;
    }
  }

  start() {
    this.runMigration();
    return this;
  }

  reset() {
    try {
      execSync(
        `DATABASE_URL="${this.connectionUri}" pnpx prisma migrate reset --force --skip-seed`,
        {
          stdio: 'inherit',
          env: {
            ...process.env,
            DATABASE_URL: this.connectionUri,
            DOCKER_DB_URL: this.connectionUri,
          },
        },
      );
    } catch (error) {
      console.error('Reset failed:', error);
      throw new Error(`Failed to reset database: ${error}`);
    }
  }

  private runMigration() {
    try {
      console.log(
        `🧘🏾‍♂️ Running migrations on test database ${this.connectionUri}...`,
      );
      execSync(
        `DATABASE_URL="${this.connectionUri}" pnpx prisma migrate deploy`,
        {
          stdio: 'inherit',
          env: {
            ...process.env,
            DATABASE_URL: this.connectionUri,
            DOCKER_DB_URL: this.connectionUri,
          },
        },
      );
    } catch (error) {
      console.error('Migration failed:', error);
      throw new Error(`Failed to run migrations: ${error}`);
    }
  }

  async stop() {
    console.log('🛑 Stopping test container...');
    await this.dbContainer.stop();
    DbTestContainerManager.instance = null;
  }

  get connectionUri() {
    return this.dbContainer.getConnectionUri();
  }

  get containerId() {
    return this.dbContainer.getId();
  }

  static stopContainerById(containerId: string) {
    try {
      execSync(`docker stop ${containerId}`, { stdio: 'inherit' });
      console.log(`✅ Stopped container ${containerId}`);
    } catch (error) {
      console.error(`❌ Failed to stop container ${containerId}:`, error);
      throw error;
    }
  }
}
