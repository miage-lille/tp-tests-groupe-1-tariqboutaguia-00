import { PrismaClient } from '@prisma/client';
import { RealDateGenerator } from 'src/core/adapters/real-date-generator';
import { RealIdGenerator } from 'src/core/adapters/real-id-generator';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { ChangeSeats } from 'src/webinars/use-cases/change-seats';
import { OrganizeWebinars } from 'src/webinars/use-cases/organize-webinar';

export class AppContainer {
  private prismaClient!: PrismaClient;
  private webinarRepository!: PrismaWebinarRepository;
  private changeSeatsUseCase!: ChangeSeats;
  private organizeWebinarsUseCase!: OrganizeWebinars;

  init(prismaClient: PrismaClient) {
    this.prismaClient = prismaClient;
    this.webinarRepository = new PrismaWebinarRepository(this.prismaClient);
    this.changeSeatsUseCase = new ChangeSeats(this.webinarRepository);
    this.organizeWebinarsUseCase = new OrganizeWebinars(
      this.webinarRepository,
      new RealIdGenerator(),
      new RealDateGenerator(),
    );
  }

  getPrismaClient() {
    return this.prismaClient;
  }

  getChangeSeatsUseCase() {
    return this.changeSeatsUseCase;
  }

  getOrganizeWebinarsUseCase() {
    return this.organizeWebinarsUseCase;
  }
}

export const container = new AppContainer();