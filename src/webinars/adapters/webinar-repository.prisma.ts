import { PrismaClient, Webinar as PrismaWebinar } from '@prisma/client';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';

export class PrismaWebinarRepository implements IWebinarRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(webinar: Webinar): Promise<void> {
    await this.prisma.webinar.create({
      data: WebinarMapper.toPersistence(webinar),
    });
    return;
  }

  async findById(id: string): Promise<Webinar | null> {
    const maybeWebinar = await this.prisma.webinar.findUnique({
      where: { id },
    });
    if (!maybeWebinar) {
      return null;
    }
    return WebinarMapper.toEntity(maybeWebinar);
  }

  async update(webinar: Webinar): Promise<void> {
    await this.prisma.webinar.update({
      where: { id: webinar.props.id },
      data: WebinarMapper.toPersistence(webinar),
    });
    return;
  }
}

class WebinarMapper {
  static toEntity(webinar: PrismaWebinar): Webinar {
    return new Webinar({
      id: webinar.id,
      organizerId: webinar.organizerId,
      title: webinar.title,
      startDate: webinar.startDate,
      endDate: webinar.endDate,
      seats: webinar.seats,
    });
  }

  static toPersistence(webinar: Webinar): {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    seats: number;
    organizerId: string;
  } {
    return {
      id: webinar.props.id,
      organizerId: webinar.props.organizerId,
      title: webinar.props.title,
      startDate: webinar.props.startDate,
      endDate: webinar.props.endDate,
      seats: webinar.props.seats,
    };
  }
}