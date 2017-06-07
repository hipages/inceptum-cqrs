import { Event, EventOptions } from './Event';

export type AggregateEventOptions = EventOptions & {aggregateId: string};

export abstract class AggregateEvent extends Event {
  aggregateId: string;

  constructor(obj: AggregateEventOptions) {
    super(obj);
    this.aggregateId = obj.aggregateId;
  }
  getAggregateId() {
    return this.aggregateId;
  }
  abstract apply(aggregate);
}
