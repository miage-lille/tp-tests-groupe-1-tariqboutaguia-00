import { TestServerFixture } from 'src/tests/fixtures';
import supertest from 'supertest';

describe('Webinar Routes E2E', () => {
  let fixture: TestServerFixture;

  beforeAll(async () => {
    fixture = new TestServerFixture();
    await fixture.init();
  });

  beforeEach(async () => {
    await fixture.reset();
  });

  afterAll(async () => {
    await fixture.stop();
  });

  describe('POST /webinars/:id/seats - Change seats', () => {
    describe('Scenario: Happy path', () => {
      it('should update webinar seats', async () => {
        // ARRANGE
        const prisma = fixture.getPrismaClient();
        const server = fixture.getServer();

        const webinar = await prisma.webinar.create({
          data: {
            id: 'test-webinar',
            title: 'Webinar Test',
            seats: 10,
            startDate: new Date(),
            endDate: new Date(),
            organizerId: 'test-user',
          },
        });

        // ACT
        const response = await supertest(server)
          .post(`/webinars/${webinar.id}/seats`)
          .send({ seats: '30' })
          .expect(200);

        // ASSERT
        expect(response.body).toEqual({ message: 'Seats updated' });

        const updatedWebinar = await prisma.webinar.findUnique({
          where: { id: webinar.id },
        });
        expect(updatedWebinar?.seats).toBe(30);
      });
    });

    describe('Scenario: Webinar not found', () => {
      it('should return 404 when webinar does not exist', async () => {
        // ARRANGE
        const server = fixture.getServer();

        // ACT
        const response = await supertest(server)
          .post('/webinars/non-existent-id/seats')
          .send({ seats: '30' })
          .expect(404);

        // ASSERT
        expect(response.body).toEqual({
          error: 'Webinar not found',
        });
      });
    });

    describe('Scenario: User is not organizer', () => {
      it('should return 401 when user is not organizer', async () => {
        // ARRANGE
        const prisma = fixture.getPrismaClient();
        const server = fixture.getServer();

        const webinar = await prisma.webinar.create({
          data: {
            id: 'test-webinar',
            title: 'Webinar Test',
            seats: 10,
            startDate: new Date(),
            endDate: new Date(),
            organizerId: 'different-user', // Different from test-user
          },
        });

        // ACT
        const response = await supertest(server)
          .post(`/webinars/${webinar.id}/seats`)
          .send({ seats: '30' })
          .expect(401);

        // ASSERT
        expect(response.body).toEqual({
          error: 'User is not allowed to update this webinar',
        });
      });
    });
  });

  describe('POST /webinars - Organize webinar', () => {
    describe('Scenario: Happy path', () => {
      it('should create a webinar', async () => {
        // ARRANGE
        const server = fixture.getServer();
        const prisma = fixture.getPrismaClient();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 4); // 4 days from now
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);

        // ACT
        const response = await supertest(server)
          .post('/webinars')
          .send({
            title: 'New Webinar',
            seats: '50',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          })
          .expect(201);

        // ASSERT
        expect(response.body).toHaveProperty('id');
        expect(response.body.message).toEqual('Webinar created');

        const createdWebinar = await prisma.webinar.findUnique({
          where: { id: response.body.id },
        });
        expect(createdWebinar).not.toBeNull();
        expect(createdWebinar?.title).toBe('New Webinar');
        expect(createdWebinar?.seats).toBe(50);
      });
    });

    describe('Scenario: Webinar scheduled too soon', () => {
      it('should return 400 when webinar is scheduled too soon', async () => {
        // ARRANGE
        const server = fixture.getServer();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1); // Only 1 day from now
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);

        // ACT
        const response = await supertest(server)
          .post('/webinars')
          .send({
            title: 'Too Soon Webinar',
            seats: '50',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          })
          .expect(400);

        // ASSERT
        expect(response.body).toEqual({
          error: 'Webinar must be scheduled at least 3 days in advance',
        });
      });
    });

    describe('Scenario: Too many seats', () => {
      it('should return 400 when seats exceed 1000', async () => {
        // ARRANGE
        const server = fixture.getServer();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 4);
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);

        // ACT
        const response = await supertest(server)
          .post('/webinars')
          .send({
            title: 'Too Many Seats Webinar',
            seats: '1001',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          })
          .expect(400);

        // ASSERT
        expect(response.body).toEqual({
          error: 'Webinar must have at most 1000 seats',
        });
      });
    });

    describe('Scenario: Not enough seats', () => {
      it('should return 400 when seats are 0', async () => {
        // ARRANGE
        const server = fixture.getServer();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 4);
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);

        // ACT
        const response = await supertest(server)
          .post('/webinars')
          .send({
            title: 'No Seats Webinar',
            seats: '0',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          })
          .expect(400);

        // ASSERT
        expect(response.body).toEqual({
          error: 'Webinar must have at least 1 seat',
        });
      });
    });
  });
});
