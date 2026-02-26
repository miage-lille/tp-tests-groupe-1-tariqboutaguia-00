import { IIdGenerator } from 'src/core/ports/id-generator.interface';
import { randomUUID } from 'crypto';

export class RealIdGenerator implements IIdGenerator {
  generate() {
    return randomUUID();
  }
}
