import { IdGenerator, UUIDGenerator } from '../IdGenerator';
import { Command } from './Command';
import { AggregateCommand, AggregateCommandOptions } from './AggregateCommand';

const defaultGenerator = new UUIDGenerator();

export type AggregateCreatingCommandOptions = AggregateCommandOptions & {aggregateType?: string};


export abstract class AggregateCreatingCommand extends AggregateCommand {
  aggregateType: string;
  /**
   *
   * @param {object} obj The object to take parameters from
   * @param {Auth} issuerAuth The Auth object of the issuer of this command
   * @param {[string]} commandId The id for this command. If not specified, the IdGenerator will be called to generate one
   * @param {string} aggregateId The id of the aggregate this command acts upon
   * @param {string} aggregateType The type of aggregate this command will create
   */
  constructor(obj: AggregateCreatingCommandOptions) {
    super(obj);
    this.aggregateType = obj.aggregateType;
  }
  getAggregateType() {
    return this.aggregateType;
  }
  getAggregateId() {
    if (!this.aggregateId) {
      this.aggregateId = this.getIdGenerator().generate(this.constructor.name);
    }
    return this.aggregateId;
  }
  // tslint:disable-next-line:prefer-function-over-method
  getIdGenerator(): IdGenerator {
    return defaultGenerator;
  }
}
