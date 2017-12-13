import { EventExecutor } from '../EventExecutor';
import { AggregateEventStore } from './AggregateEventStore';

export class InMemoryAggregateEventStore extends AggregateEventStore {
  store: Map<string, any>;
  eventExecutors: EventExecutor<any, any>[] = [];
  constructor(eventExecutors: EventExecutor<any, any>[]) {
    super();
    this.store = new Map();
    this.eventExecutors = eventExecutors;
  }
  /**
   * Load all the events of an aggregate
   * @param {string} aggregateId The id of the aggregate whose events we want to load
   * @returns {AggregateEvent[]} The list of aggregate events of this aggregate
   */
// eslint-disable-next-line no-unused-vars
  async getEventsOf(aggregateId: string): Promise<Array<any>> {
    const eventStrArr = this.store.get(aggregateId);
    if (!eventStrArr || eventStrArr.length === 0) {
      return [];
    }
    return eventStrArr;
  }
  /**
   * Saves an aggregate event to the persistent store
   * @param {AggregateEvent} aggregateEvent The aggregate event to store
   */
// eslint-disable-next-line no-unused-vars
  async commitEvent(aggregateEvent: any): Promise<void> {
    const executor = EventExecutor.getEventExecutor(aggregateEvent, this.eventExecutors);
    if (!executor) {
      throw new Error(`Unknown event to commit ${aggregateEvent.constructor.name}`);
    }
    const aggregateId = executor.getAggregateId(aggregateEvent);
    if (!this.store.has(aggregateId)) {
      const events = [];
      events.push(aggregateEvent);
      this.store.set(aggregateId, events);
    } else {
      const events = this.store.get(aggregateId);
      events.push(aggregateEvent);
    }
  }
}
