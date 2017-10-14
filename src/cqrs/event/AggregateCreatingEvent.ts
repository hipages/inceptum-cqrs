import { AggregateEvent, AggregateEventOptions } from './AggregateEvent';

export type AggregateCreatingEventOptions = AggregateEventOptions & {aggregateType?: string};

export abstract class AggregateCreatingEvent extends AggregateEvent {
  aggregateType: string;
  constructor(obj: AggregateCreatingEventOptions) {
    super(obj);
    this.aggregateType = obj.aggregateType;
  }
  getAggregateType() {
    return this.aggregateType;
  }
}
