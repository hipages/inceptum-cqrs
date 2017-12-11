import {ExecutionContext} from '../ExecutionContext';
import { Aggregate } from '../Aggregate';
import { AggregateCreatingCommand } from './AggregateCreatingCommand';
import { Command } from './Command';
import { AggregateCommand } from './AggregateCommand';


export abstract class CommandExecutor<T extends Command, A extends Aggregate> {
  abstract async validate(command: T, executionContext: ExecutionContext, aggregate?: A): Promise<void>;

  abstract async doExecute(command: T, executionContext: ExecutionContext, aggregate?: A): Promise<void>;

  abstract async validateAuth(command: T, executionContext: ExecutionContext, aggregate?: A): Promise<void>;

  /**
   * Executed this command as part of the execution context.
   * @param {T} command
   * @param {ExecutionContext} executionContext
   * @param {A} aggregate? If the command is an instance of AggregateCommand an aggregate should be present
   * @returns {*}
   */
  async execute(command: T, executionContext: ExecutionContext, aggregate?: A): Promise<void> {
    if (command instanceof AggregateCommand && (!aggregate && !(command instanceof AggregateCreatingCommand))) {
      throw new Error(`Execution of an AggregateCommand of type ${command.constructor.name} must have an aggregate`);
    }
    await this.validate(command, executionContext, aggregate);
    await this.validateAuth(command, executionContext, aggregate);
    await this.doExecute(command, executionContext, aggregate);
  }

  abstract canExecute(command: Command): boolean;
}
