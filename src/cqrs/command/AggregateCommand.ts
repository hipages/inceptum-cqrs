import { ExecutionContext } from '../ExecutionContext';
import { Command, CommandOptions } from './Command';

export type AggregateCommandOptions = CommandOptions & {aggregateId?: string};

export abstract class AggregateCommand extends Command {
  protected aggregateId: string;
  /**
   *
   * @param {object} obj The object to take parameters from
   * @param {Auth} issuerAuth The Auth object of the issuer of this command
   * @param {[string]} commandId The id for this command. If not specified, the IdGenerator will be called to generate one
   * @param {string} aggregateId The id of the aggregate this command acts upon
   */
  constructor(obj: AggregateCommandOptions) {
    super(obj);
    this.aggregateId = obj.aggregateId;
  }
  getAggregateId(): string {
    return this.aggregateId;
  }

  /**
   * Validates that the command can execute.
   * This method must be overriden by concrete command implementations
   * @param {ExecutionContext} executionContext The execution context for this command to run on
   * @param {Aggregate} aggregate The aggregate this command will execute on
   */
  abstract async validateWithAggregate(executionContext, aggregate): Promise<void>;

  // tslint:disable-next-line:prefer-function-over-method
  async validate(executionContext: ExecutionContext): Promise<void> {
    throw new Error('Please call validateWithAggregate instead');
  }

  /**
   * Executes an already validated command on the given aggregate.
   * This method must be overriden by concrete command implementations
   * @param {ExecutionContext} executionContext The execution context for this command to run on
   * @param {Aggregate} aggregate The aggregate this command will execute on
   */
  abstract async doExecuteWithAggregate(executionContext, aggregate): Promise<void>;

  // tslint:disable-next-line:prefer-function-over-method
  async doExecute(executionContext: ExecutionContext): Promise<void> {
    throw new Error('Please call doExecuteWithAggregate instead');
  }

  /**
   * Checks whether the issuer of the command has enough privileges to execute this command
   * @param {ExecutionContext} executionContext The execution context for this command to run on
   * @param {Aggregate} aggregate The aggregate this command will execute on
   */
  abstract async validateAuthWithAggregate(executionContext, aggregate): Promise<void>;

  // tslint:disable-next-line:prefer-function-over-method
  async validateAuth(executionContext: ExecutionContext): Promise<void> {
    throw new Error('Please call validateAuthWithAggregate');
  }

  getRolesForAggregate(aggregate) {
    const authRoles = this.issuerAuth.getRoles(aggregate.getFullId()) || [];
    const aggRoles = aggregate.getAggregateRolesFor(this.issuerAuth.getFullId());
    return [].concat(authRoles, aggRoles);
  }

  // tslint:disable-next-line:prefer-function-over-method
  async execute(executionContext) {
    throw new Error('Please call executeWithAggregate instead');
  }
  /**
   * Executes this command on the given execution context.
   * You shouldn't override this method. Instead you should provide implementations of the
   * {@link validate} and {@link doExecute} methods.
   * @param {ExecutionContext} executionContext The execution context for this command to run on
   * @param {Aggregate} aggregate The aggregate this command will execute on
   */
  async executeWithAggregate(executionContext, aggregate): Promise<void> {
    await this.validateWithAggregate(executionContext, aggregate);
    await this.validateAuthWithAggregate(executionContext, aggregate);
    await this.doExecuteWithAggregate(executionContext, aggregate);
  }
}

