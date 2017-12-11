import { Auth } from '../../auth/Auth';
import { ExecutionContext } from '../ExecutionContext';
import { IdGenerator, UUIDGenerator } from '../IdGenerator';

const commandFieldType = '@commandType';
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
  issuerAuth: Auth;
  commandId: string;
  commandTimestamp: number;
  static commandClasses = new Map<string, Function>();

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
    this[commandFieldType] = this.constructor.name;
  }
  getCommandId(): string {
    return this.commandId;
  }
  getCommandType(): string {
    return this[commandFieldType];
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
  static registerCommandClass(eventClass: Function) {
    Command.commandClasses.set(eventClass.name, eventClass);
  }
  static fromObject(obj: Object, commandType: string): Command {
    if (!commandType && !Object.hasOwnProperty.call(obj, commandFieldType)) {
      throw new Error(`Can't deserialise object into typed instance because it doesn't have a ${commandFieldType} field`);
    }
    const type = commandType || obj[commandFieldType];
    if (!Command.commandClasses.has(type)) {
      throw new Error(`Unknown command type ${type}`);
    }
    const typeConstructor = Command.commandClasses.get(type);
    return Reflect.construct(typeConstructor, [obj]);
  }
  // tslint:disable-next-line:prefer-function-over-method
  protected getIdGenerator(): IdGenerator {
    return defaultGenerator;
  }
}
