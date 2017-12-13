
export abstract class AggregateEventStore {
  /**
   * Load all the events of an aggregate
   * @param {string} aggregateId The id of the aggregate whose events we want to load
   * @returns {AggregateEvent[]} The list of aggregate events of this aggregate
   */
  abstract async getEventsOf(aggregateId: string): Promise<Array<any>>;

  /**
   * Saves an aggregate event to the persistent store
   * @param {AggregateEvent} aggregateEvent The aggregate event to store
   */
  abstract async commitEvent(aggregateEvent: any): Promise<void>;

  /**
   * Saves a list of aggregate events to the persistent store
   * @param {AggregateEvent[]} aggregateEvents The array of aggregate events to store
   */

  async commitAllEvents(aggregateEvents: Array<any>): Promise<void> {
    await Promise.all(aggregateEvents.map(async (event) => await this.commitEvent(event)));
  }
}
