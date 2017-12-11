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

  getRolesForAggregate(aggregate) {
    const authRoles = this.issuerAuth.getRoles(aggregate.getFullId()) || [];
    const aggRoles = aggregate.getAggregateRolesFor(this.issuerAuth.getFullId());
    return [].concat(authRoles, aggRoles);
  }
}

