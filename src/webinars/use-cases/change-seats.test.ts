import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { WebinarNotOrganizerException } from 'src/webinars/exceptions/webinar-not-organizer';
import { WebinarReduceSeatsException } from 'src/webinars/exceptions/webinar-reduce-seats';
import { WebinarTooManySeatsException } from 'src/webinars/exceptions/webinar-too-many-seats';
import { testUser } from 'src/users/tests/user-seeds';
import { ChangeSeats } from './change-seats';

describe('Feature : Change seats', () => {
  let webinarRepository: InMemoryWebinarRepository;
  let useCase: ChangeSeats;

  const webinar = new Webinar({
    id: 'webinar-id',
    organizerId: testUser.alice.props.id,
    title: 'Webinar title',
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-01-01T01:00:00Z'),
    seats: 100,
  });

  beforeEach(() => {
    webinarRepository = new InMemoryWebinarRepository([webinar]);
    useCase = new ChangeSeats(webinarRepository);
  });

  // Helper methods for better readability
  function expectWebinarToRemainUnchanged() {
    const webinarSnapshot = webinarRepository.findByIdSync('webinar-id');
    expect(webinarSnapshot?.props.seats).toEqual(100);
  }

  async function whenUserChangeSeatsWith(payload: {
    user: typeof testUser.alice;
    webinarId: string;
    seats: number;
  }) {
    return await useCase.execute(payload);
  }

  function thenUpdatedWebinarSeatsShouldBe(expectedSeats: number) {
    const updatedWebinar = webinarRepository.findByIdSync('webinar-id');
    expect(updatedWebinar?.props.seats).toEqual(expectedSeats);
  }

  describe('Scenario: Happy path', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'webinar-id',
      seats: 200,
    };

    it('should change the number of seats for a webinar', async () => {
      // ACT
      await whenUserChangeSeatsWith(payload);

      // ASSERT
      thenUpdatedWebinarSeatsShouldBe(200);
    });
  });

  describe('Scenario: Webinar does not exist', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'non-existent-id',
      seats: 200,
    };

    it('should fail when webinar does not exist', async () => {
      // ACT & ASSERT
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarNotFoundException,
      );
    });

    it('should not modify any webinar', async () => {
      // ACT
      try {
        await whenUserChangeSeatsWith(payload);
      } catch (error) {
        // Expected error
      }

      // ASSERT
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: User is not organizer', () => {
    const payload = {
      user: testUser.bob, // bob is not the organizer (alice is)
      webinarId: 'webinar-id',
      seats: 200,
    };

    it('should fail when user is not organizer', async () => {
      // ACT & ASSERT
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarNotOrganizerException,
      );
    });

    it('should not modify the webinar', async () => {
      // ACT
      try {
        await whenUserChangeSeatsWith(payload);
      } catch (error) {
        // Expected error
      }

      // ASSERT
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: Change seats to inferior number', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'webinar-id',
      seats: 50, // Less than current 100
    };

    it('should fail when reducing number of seats', async () => {
      // ACT & ASSERT
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarReduceSeatsException,
      );
    });

    it('should not modify the webinar', async () => {
      // ACT
      try {
        await whenUserChangeSeatsWith(payload);
      } catch (error) {
        // Expected error
      }

      // ASSERT
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: Change seats to number > 1000', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'webinar-id',
      seats: 1001, // More than max 1000
    };

    it('should fail when seats exceed maximum', async () => {
      // ACT & ASSERT
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarTooManySeatsException,
      );
    });

    it('should not modify the webinar', async () => {
      // ACT
      try {
        await whenUserChangeSeatsWith(payload);
      } catch (error) {
        // Expected error
      }

      // ASSERT
      expectWebinarToRemainUnchanged();
    });
  });
});