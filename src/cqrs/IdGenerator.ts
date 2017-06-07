import * as uuid from 'uuid';

/**
 * Default IdGenerator that creates uuids
 */
export abstract class IdGenerator {
  /**
   * Generates an id
   * @param {string} type The type for which we need to generate an ID. E.g. 'Event', 'Command', etc
   */
  abstract generate(type?: string): string;
}


export class UUIDGenerator extends IdGenerator {
   // tslint:disable-next-line:prefer-function-over-method
   generate(type: string): string {
    return `${uuid.v1()}:${type}`;
  }
}
