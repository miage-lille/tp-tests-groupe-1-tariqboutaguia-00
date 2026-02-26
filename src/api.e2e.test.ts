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
});
