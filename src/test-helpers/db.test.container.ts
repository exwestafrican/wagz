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

  static async createContainerOf(workerId: string) {
    const dbContainer = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase(`envoyeTestDb_${workerId}`)
      .withUsername('prismaTestUser')
      .withPassword('password')
      .withExposedPorts(5432)
      .start();

    console.log(
      `🚀 Test container started with connection ${dbContainer.getConnectionUri()} and workerId ${workerId}`,
    );
    return new DbTestContainerManager(dbContainer);
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
}
