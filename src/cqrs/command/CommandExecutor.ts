import { Histogram, Counter } from 'prom-client';
import {ExecutionContext} from '../ExecutionContext';
import { Aggregate } from '../Aggregate';
import { ValidationError } from '../error/ValidationError';
import { AuthorizationError } from '../error/AuthorizationError';
import { ReturnToCallerError } from '../error/ReturnToCallerError';
import { SwaggerCQRSMiddleware } from '../plugin/SwaggerCQRSMiddleware';
import { AggregateCreatingCommand } from './AggregateCreatingCommand';
import { Command } from './Command';
import { AggregateCommand } from './AggregateCommand';

const commandTimer = new Histogram({
  name: 'cqrs_command_timer',
  help: 'Timer for the command histogram',
  labelNames: ['command'],
  buckets: [0.003, 0.03, 0.1, 0.3, 0.5, 1.5, 5, 10],
});

const commandErrorCounter = new Counter({
  name: 'cqrs_command_error_counter',
  labelNames: ['command', 'errorType'],
  help: 'Number of commands that have an error',
});

export abstract class CommandExecutor<T extends Command, A extends Aggregate> {

  /**
   * Validate the command previous to execution.
   *
   * If the command can't be executed, this method should throw an Error
   * that extends from {@link ValidationError}
   * @param command The command to validate
   * @param executionContext The execution context in which this command os to be executed
   * @param aggregate The (optional) aggregate this command acts on
   */
  abstract async validate(command: T, executionContext: ExecutionContext, aggregate?: A): Promise<void>;

  /**
   * Executes the given command
   *
   * If the command throws an exception it will be transformed into a 500 error automatically by the {@link SwaggerCQRSMiddleware}.
   * If you want the error to be returned to the client, make sure your
   * error extends from {@link ReturnToCallerError} and specify any desired info.
   * @param command The command to execute
   * @param executionContext The execution context in which this command os to be executed
   * @param aggregate The (optional) aggregate this command acts on
   */
  abstract async doExecute(command: T, executionContext: ExecutionContext, aggregate?: A): Promise<void>;

  /**
   * Validate the authorization needed to execute this command.
   *
   * If the command can't be executed, this method should throw an Error
   * that extends from {@link ../error/AuthorizationError}
   * @param command The command to validate authorization for
   * @param executionContext The execution context in which this command os to be executed
   * @param aggregate The (optional) aggregate this command acts on
   */
  abstract async validateAuth(command: T, executionContext: ExecutionContext, aggregate?: A): Promise<void>;

  /**
   * Executed this command as part of the execution context.
   * @param {T} command
   * @param {ExecutionContext} executionContext
   * @param {A} aggregate? If the command is an instance of AggregateCommand an aggregate should be present
   * @returns {*}
   */
  async execute(command: T, executionContext: ExecutionContext, aggregate?: A): Promise<void> {
    const timer = commandTimer.startTimer({command: command ? command.getCommandType() : 'na'});
    try {
      if (command instanceof AggregateCommand && (!aggregate && !(command instanceof AggregateCreatingCommand))) {
        throw new ReturnToCallerError(`Execution of an AggregateCommand of type ${command.constructor.name} must have a valid aggregate`);
      }
      await this.validate(command, executionContext, aggregate);
      await this.validateAuth(command, executionContext, aggregate);
      await this.doExecute(command, executionContext, aggregate);
    } catch (e) {
      commandErrorCounter.labels(command ? command.getCommandType() : 'na', e && e.contructor && e.constructor.name ? e.constructor.name : 'na').inc();
      throw e;
    } finally {
      timer();
    }
  }

  abstract canExecute(command: Command): boolean;
}
