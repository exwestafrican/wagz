import { PrismaPg } from '@prisma/adapter-pg';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { PrismaClient } from '../generated/prisma/client';

export default class DbTestContainerManager {
    private dbContainer: StartedPostgreSqlContainer;
    private static instance: DbTestContainerManager | null = null;

    private constructor(dbContainer) {
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
            console.log("🚀 Test container started with connection:", dbContainer.getConnectionUri());

        this.instance = new DbTestContainerManager(dbContainer);
        return this.instance;
        }


    }

    async  start() {
        await this.runMigration();
        await this.verifyTablesExist();
        return this
    }

    private async verifyTablesExist() {
        try {
            const adapter = new PrismaPg({ connectionString: this.connectionUri });
            const client = new PrismaClient({ adapter });
            await client.$connect();

            // Try to query the table to verify it exists
            await client.$queryRaw`SELECT 1 FROM "PreVerification" LIMIT 1`;

            await client.$disconnect();
            console.log('✅ Verified PreVerification table exists');
        } catch (error) {
            console.error('❌ Table verification failed:', error);
            throw new Error('Migrations may not have completed successfully');
        }
    }

    async reset(): Promise<void> {
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
                }
            );
        } catch (error) {
            console.error('Reset failed:', error);
            throw new Error(`Failed to reset database: ${error}`);
        }
    }

    private async runMigration(){

        try {
            console.log(`🧘🏾‍♂️ Running migrations on test database ${this.connectionUri}...`);
            execSync(`DATABASE_URL="${this.connectionUri}" pnpx prisma migrate deploy`, {
              stdio: 'inherit',
              env: { ...process.env, DATABASE_URL: this.connectionUri, DOCKER_DB_URL:this.connectionUri },
            });
       } catch (error) {
            console.error('Migration failed:', error);
            throw new Error(`Failed to run migrations: ${error}`);
          }
    }

    async stop() {
        console.log("🛑 Stopping test container...");
        this.dbContainer.stop();
        DbTestContainerManager.instance = null;
    }

    get connectionUri() {
        return this.dbContainer.getConnectionUri()
    }

    get containerId() {
        return this.dbContainer.getId();
    }


     // Add static method to stop container by ID (for use in teardown)
     static async stopContainerById(containerId: string): Promise<void> {
        const { execSync } = require('child_process');
        try {
            execSync(`docker stop ${containerId}`, { stdio: 'inherit' });
            console.log(`✅ Stopped container ${containerId}`);
        } catch (error) {
            console.error(`❌ Failed to stop container ${containerId}:`, error);
            throw error;
        }
    }



}
