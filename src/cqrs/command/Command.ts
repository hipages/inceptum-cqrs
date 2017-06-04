import { Auth } from '../../auth/Auth';
import { ExecutionContext } from '../ExecutionContext';
const { IdGenerator } = require('../IdGenerator');

const commandFieldType = '@commandType';

interface Glue {
  registerCommandClass: Function;
}

export type CommandOptions = {
  issuerAuth: Auth,
  commandId?: string
}

export abstract class Command {
  issuerAuth: Auth;
  commandId: string;
  static commandClasses = new Map<string, Function>();

  /**
   * Creates a new command instance from the provided info.
   * @param {object} obj The object to take parameters from
   * @param {Auth} issuerAuth The Auth object of the issuer of this command
   * @param {[string]} commandId The id for this command. If not specified, the IdGenerator will be called to generate one
   */
  constructor(obj: CommandOptions) {
    this.copyFrom(obj, ['issuerAuth', 'commandId'], { commandId: IdGenerator.generate });
    this[commandFieldType] = this.constructor.name;
  }
  getCommandId(): string {
    return this.commandId;
  }
  getCommandType(): string {
    return this[commandFieldType];
  }
// eslint-disable-next-line no-unused-vars
  abstract validate(executionContext: ExecutionContext);

// eslint-disable-next-line no-unused-vars
  abstract doExecute(executionContext: ExecutionContext);

// eslint-disable-next-line no-unused-vars
  abstract validateAuth(executionContext: ExecutionContext);

  /**
   * Executed this command as part of the execution context.
   * @param {ExecutionContext} executionContext
   * @returns {*}
   */
  execute(executionContext: ExecutionContext) {
    this.validate(executionContext);
    this.validateAuth(executionContext);
    this.doExecute(executionContext);
  }
  getIssuerAuth(): Auth {
    return this.issuerAuth;
  }
  copyFrom(from: Object, properties: Array<string>, defaults?: Object) {
    properties.forEach((p) => {
      if (Object.hasOwnProperty.call(from, p)) {
        this[p] = from[p];
      } else if (defaults && Object.hasOwnProperty.call(defaults, p)) {
        if (defaults[p] instanceof Function) {
          this[p] = defaults[p]();
        } else {
          this[p] = defaults[p];
        }
      }
    });
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

}
