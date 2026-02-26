import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { promisify } from 'util';

const asyncExec = promisify(exec);

describe('PrismaWebinarRepository', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;

  beforeAll(async () => {
    // Connect to database
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

    // Run migrations to populate the database
    // Windows-compatible command using PowerShell
    const isWindows = process.platform === 'win32';
    const prismaCliPath = './node_modules/prisma/build/index.js';
    const migrateCmd = isWindows
      ? `powershell -Command "$env:DATABASE_URL='${dbUrl}'; node ${prismaCliPath} migrate deploy"`
      : `DATABASE_URL=${dbUrl} node ${prismaCliPath} migrate deploy`;
    await asyncExec(migrateCmd);

    return prismaClient.$connect();
  });

  beforeEach(async () => {
    repository = new PrismaWebinarRepository(prismaClient);
    await prismaClient.webinar.deleteMany();
    await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  });

  afterAll(async () => {
    await container.stop({ timeout: 1000 });
    return prismaClient.$disconnect();
  });

  describe('Scenario: repository.create', () => {
    it('should create a webinar', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });

      // ACT
      await repository.create(webinar);

      // ASSERT
      const maybeWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-id' },
      });
      expect(maybeWebinar).toEqual({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
    });
  });

  describe('Scenario: repository.findById', () => {
    it('should find a webinar by id', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
      await repository.create(webinar);

      // ACT
      const result = await repository.findById('webinar-id');

      // ASSERT
      expect(result).not.toBeNull();
      expect(result?.props.id).toEqual('webinar-id');
      expect(result?.props.title).toEqual('Webinar title');
      expect(result?.props.seats).toEqual(100);
    });

    it('should return null when webinar does not exist', async () => {
      // ACT
      const result = await repository.findById('non-existent-id');

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe('Scenario: repository.update', () => {
    it('should update a webinar', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
      await repository.create(webinar);

      // ACT
      webinar.update({ seats: 200 });
      await repository.update(webinar);

      // ASSERT
      const updatedWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-id' },
      });
      expect(updatedWebinar?.seats).toEqual(200);
    });

    it('should update only specified fields', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
      await repository.create(webinar);

      // ACT
      webinar.update({ seats: 300, title: 'Updated title' });
      await repository.update(webinar);

      // ASSERT
      const updatedWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-id' },
      });
      expect(updatedWebinar?.seats).toEqual(300);
      expect(updatedWebinar?.title).toEqual('Updated title');
      expect(updatedWebinar?.organizerId).toEqual('organizer-id'); // unchanged
    });
  });
});