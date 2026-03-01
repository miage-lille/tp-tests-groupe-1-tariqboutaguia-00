import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { FixedDateGenerator } from 'src/core/adapters/fixed-date-generator';
import { FixedIdGenerator } from 'src/core/adapters/fixed-id-generator';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { OrganizeWebinars } from 'src/webinars/use-cases/organize-webinar';
import { promisify } from 'util';

const asyncExec = promisify(exec);

describe('OrganizeWebinars (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let useCase: OrganizeWebinars;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .withExposedPorts(5432)
      .start();

    const dbUrl = container.getConnectionUri();
    prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });

    const isWindows = process.platform === 'win32';
    const prismaCliPath = './node_modules/prisma/build/index.js';
    const migrateCmd = isWindows
      ? `powershell -Command "$env:DATABASE_URL='${dbUrl}'; node ${prismaCliPath} migrate deploy"`
      : `DATABASE_URL=${dbUrl} node ${prismaCliPath} migrate deploy`;
    await asyncExec(migrateCmd);

    return prismaClient.$connect();
  });

  beforeEach(async () => {
    const repository = new PrismaWebinarRepository(prismaClient);
    useCase = new OrganizeWebinars(
      repository,
      new FixedIdGenerator(),
      new FixedDateGenerator(new Date('2024-01-01T00:00:00Z')),
    );
    await prismaClient.webinar.deleteMany();
    await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  });

  afterAll(async () => {
    await container.stop({ timeout: 1000 });
    return prismaClient.$disconnect();
  });

  describe('Scenario: Happy path', () => {
    it('should create a webinar', async () => {
      // ARRANGE
      const startDate = new Date('2024-01-05T00:00:00Z');
      const endDate = new Date('2024-01-05T01:00:00Z');

      // ACT
      const result = await useCase.execute({
        userId: 'user-id',
        title: 'Webinar title',
        seats: 100,
        startDate,
        endDate,
      });

      // ASSERT
      expect(result).toEqual({ id: 'id-1' });
      const created = await prismaClient.webinar.findUnique({
        where: { id: 'id-1' },
      });
      expect(created).toEqual({
        id: 'id-1',
        organizerId: 'user-id',
        title: 'Webinar title',
        startDate,
        endDate,
        seats: 100,
      });
    });
  });
});
