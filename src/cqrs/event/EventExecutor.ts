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
  abstract getEventId(event: E): string;
  /**
   * Depending on event definition, set ordinal in event.
   * @param event
   * @param ordinal
   */
  protected abstract setEventOrdinal(event: E, ordinal: number);
  /**
   * Event ordinal is used by optimistic locking.
   * Event ordinal could also be used to support snapshot.
   * By default return 0 if events do not have oridnal property.
   * @param event
   * @returns number
   */
  abstract getEventOrdinal(event: E): number;

  /**
   * Update event with the next event ordinal if the event has ordinal 0.
   * @param event
   * @param aggregate
   */
  updateEventOrdinal(event: E, ordinal: number) {
    // if event has not been set ordinal.
    if (!this.getEventOrdinal(event)) {
      this.setEventOrdinal(event, ordinal);
    }
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
