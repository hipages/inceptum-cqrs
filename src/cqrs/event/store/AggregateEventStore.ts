import { AggregateEvent } from '../AggregateEvent';
import { Event } from '../Event';

export abstract class AggregateEventStore {
  /**
   * Load all the events of an aggregate
   * @param {string} aggregateId The id of the aggregate whose events we want to load
   * @returns {AggregateEvent[]} The list of aggregate events of this aggregate
   */
  abstract getEventsOf(aggregateId: string): Array<AggregateEvent>;

  /**
   * Saves an aggregate event to the persistent store
   * @param {AggregateEvent} aggregateEvent The aggregate event to store
   */
  abstract commitEvent(aggregateEvent: AggregateEvent): void;

  /**
   * Saves a list of aggregate events to the persistent store
   * @param {AggregateEvent[]} aggregateEvents The array of aggregate events to store
   */

  commitAllEvents(aggregateEvents: Array<AggregateEvent>): void {
    aggregateEvents.forEach((event) => this.commitEvent(event));
  }
  /**
   * Serialises an aggregate event for storage
   * @param {AggregateEvent} event The aggregate event to serialise
   * @returns {string} The serialised aggregate event
   */
  // tslint:disable-next-line:prefer-function-over-method
  serialize(event: AggregateEvent): string {
    return JSON.stringify(event);
  }
  /**
   * Deserialises an event into an instance of the appropriate class.
   * Important to note is that all events must extend Event, and register themselves calling
   * the {@link Event.registerEventClass} method. Also, the constructor must receive only one
   * parameter that is an object from which it must copy the necessary properties.
   * @param {string} str The serialised aggregate event
   * @returns {AggregateEvent} The aggregate event as an object of the right class
   */
  // tslint:disable-next-line:prefer-function-over-method
  deserialize(str: string): AggregateEvent {
    return Event.fromObject(JSON.parse(str)) as AggregateEvent;
  }
}
