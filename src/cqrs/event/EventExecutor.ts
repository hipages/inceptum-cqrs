import {Aggregate} from '../Aggregate';

export abstract class EventExecutor<E, A extends Aggregate> {
  public static getEventExecutor(event: any, eventExecutors: EventExecutor<any, any>[]): EventExecutor<any, any> {
    if (event.__executor) {
      return event.__executor;
    }
    const eventExecutor = eventExecutors.find((executor) => executor.canExecute(event));
    if (eventExecutor) {
      Object.defineProperty(event, '__executor', { value: eventExecutor, enumerable: false });
      return eventExecutor;
    }
  }

  aggregateIdProperty: string;
  aggregateType: string;
  aggregateCreating: boolean;

  constructor(aggregateCreating = false, aggregateIdProperty?: string, aggregateType?: string) {
    this.aggregateCreating = aggregateCreating;
    this.aggregateType = aggregateType;
    this.aggregateIdProperty = aggregateIdProperty;
  }

  abstract canExecute(event: any): boolean;
  abstract apply(event: E, aggregate: A);
  abstract getEventId(event: E);
  protected abstract setEventOrdinal(event: E, ordinal: number);

  updateEventOrdinal(event: E, aggregate: Aggregate) {
    // if event has not been set ordinal.
    if (!this.getEventOrdinal(event)) {
      this.setEventOrdinal(event, aggregate.getNextEventOrdinal());
    }
  }

  /**
   * Event ordinal is used by optimistic locking.
   * By default return 0 if events do not have oridnal property.
   * @param event
   */
  protected getEventOrdinal(event: E) {
    return 0;
  }

  isAggregateCreating(): boolean {
    return this.aggregateCreating;
  }

  getAggregateType(): string {
    return this.aggregateType;
  }

  getAggregateId(event: E): string {
    return event[this.aggregateIdProperty];
  }

}
