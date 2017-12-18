import { Auth } from '../../auth/Auth';
import { ExecutionContext } from '../ExecutionContext';
import { IdGenerator, UUIDGenerator } from '../IdGenerator';

const defaultGenerator = new UUIDGenerator();

interface Glue {
  registerCommandClass: Function,
}

// tslint:disable-next-line:interface-over-type-literal
export type CommandOptions = {
  issuerAuth?: Auth,
  commandId?: string,
  commandTimestamp?: number,
};

export abstract class Command {
  static commandFieldType = '@commandType';
  issuerAuth: Auth;
  commandId: string;
  commandTimestamp: number;

  /**
   * Creates a new command instance from the provided info.
   * @param {object} obj The object to take parameters from
   * @param {Auth} issuerAuth The Auth object of the issuer of this command
   * @param {[string]} commandId The id for this command. If not specified, the IdGenerator will be called to generate one
   */
  constructor(obj: CommandOptions) {
    this.issuerAuth = obj.issuerAuth;
    this.commandTimestamp = obj.commandTimestamp || new Date().getTime();
    this.commandId = obj.commandId || this.getIdGenerator().generate(this.constructor.name);
    this[Command.commandFieldType] = this.constructor.name;
  }
  getCommandId(): string {
    return this.commandId;
  }
  getCommandType(): string {
    return this[Command.commandFieldType];
  }
  /**
   * The unix timestamp (milliseconds since Epoch) when this command was issued
   */
  getCommandTimestamp(): number {
    return this.commandTimestamp;
  }
  getIssuerAuth(): Auth {
    return this.issuerAuth;
  }
  // tslint:disable-next-line:prefer-function-over-method
  protected getIdGenerator(): IdGenerator {
    return defaultGenerator;
  }
}
