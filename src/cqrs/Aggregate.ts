import { AutowireConfig } from 'inceptum';
import { EventExecutor } from './event/EventExecutor';
import { EventExecutorNoLock } from './event/EventExecutorNoLock';

export class Aggregate {
  @AutowireConfig('Application.UseOptimisticLocking')
  protected useOptimisticLocking;

  public static applyEvents(allEvents: Object[], eventExecutors: EventExecutor<any, any>[], aggregateClasses: Map<string, Function>) {
    const firstEvent = allEvents[0];
    const firstEventExecutor = EventExecutor.getEventExecutor(firstEvent, eventExecutors);
    if (!firstEventExecutor) {
      throw new Error(`Unknown event during getAggregate: ${firstEvent.constructor.name}`);
    }
    if (!firstEventExecutor || !firstEventExecutor.isAggregateCreating()) {
      throw new Error(`The first event of aggregate ${firstEventExecutor.getAggregateId(firstEvent)} is not an AggregateCreatingEvent. Panic!`);
    }
    const aggregate = Aggregate.instantiateAggregate(firstEventExecutor.getAggregateType(), firstEventExecutor.getAggregateId(firstEvent), aggregateClasses);
    allEvents.forEach((e) => {
      const eventExecutor = EventExecutor.getEventExecutor(e, eventExecutors);
      Aggregate.applyEventOnAggregate(e, eventExecutor, aggregate);
    });
    return aggregate;
  }

  public static applyEventOnAggregate(event: Object, eventExecutor: EventExecutor<any, any>, aggregate: Aggregate) {
    if (eventExecutor) {
      if (aggregate.getUseOptimisticLocking()) {
        aggregate.checkEventCanBeApplied(event, eventExecutor.getEventOrdinal(event), eventExecutor.getEventId(event));
      }
      // applying event data to aggregate data.
      eventExecutor.apply(event, aggregate);

      if (!aggregate.getUseOptimisticLocking()) {
        return; // no locking
      }

      const eventOrdinal = eventExecutor.getEventOrdinal(event);
      if (eventOrdinal) {
        aggregate.setMaxEventOrdinal(eventOrdinal);
      } else {
        aggregate.setMaxEventOrdinal(aggregate.getNextEventOrdinal());
      }
    } else {
      throw new Error(`Unknown event during getEventExecutor: ${event.constructor.name}`);
    }
  }

  public static instantiateAggregate(aggregateType: string, aggregateId: string, aggregateClasses: Map<string, Function>): Aggregate {
    const aggregateClass = aggregateClasses.has(aggregateType) ? aggregateClasses.get(aggregateType) : Aggregate;
    return new (aggregateClass as any)(aggregateType, aggregateId);
  }

  private aggregateRoles: Map<string, Array<string>>;

  aggregateId: string;
  aggregateType: string;
  /**
   * Allow optimistic locking to support aggregate snapshot.
   */
  private maxEventOrdinal: number; // number of events in aggregate

  constructor(aggregateType: string, aggregateId: string) {
    this.aggregateType = aggregateType;
    this.aggregateId = aggregateId;
    this.aggregateRoles = new Map();
    this.maxEventOrdinal = 0;
  }

  getAggregateType() {
    return this.aggregateType;
  }

  getAggregateId() {
    return this.aggregateId;
  }

  getFullId() {
    return `${this.aggregateType}:${this.aggregateId}`;
  }

  /**
   * Gets the extra roles that this aggregate grants
   */
  getAggregateRoles(): Map<string, Array<string>>  {
    return this.aggregateRoles;
  }

  /**
   * Gets the extra roles that this aggregate grants to an entity
   * @param {string} Optional. The id of the entity we're asking about.
   * @returns {[string]} The list of roles for this aggregate
   */
  getAggregateRolesFor(entityId): Array<string> {
    if (this.aggregateRoles.has(entityId)) {
      return this.aggregateRoles.get(entityId);
    }
    return [];
  }

  addAggregateRole(entityId: string, roles: Array<string>) {
    if (this.aggregateRoles.has(entityId)) {
      this.aggregateRoles.set(entityId, this.aggregateRoles.get(entityId).concat(roles));
    } else {
      this.aggregateRoles.set(entityId, roles);
    }
  }

  removeAggregateRole(entityId: string, roles?: Array<string>) {
    if (!this.aggregateRoles.has(entityId)) {
      return; // Nothing to do.
    }
    if (!roles) {
      this.aggregateRoles.delete(entityId);
    } else {
      const entityRoles = this.aggregateRoles.get(entityId);
      const newRoles = entityRoles.filter((role) => roles.indexOf(role) < 0);
      this.aggregateRoles.set(entityId, newRoles);
    }
  }

  /**
   * Check that this event can be applied to this aggregate as the ordinal is the next one
   *
   * @param event
   * @returns number
   */
  checkEventCanBeApplied(event: any, eventOrdinal: number, eventId: any) {
    if (!eventOrdinal) {
      return; // Nothing to check
    }
    // if event has not applied ordinal.
    if (this.isPastOrdinal(eventOrdinal)) {
      const aggregateId = this.getAggregateId();
      const msg = `Event (${eventId}) has already been applied to aggregate (${aggregateId}). Its current maxOrdinal is ${this.maxEventOrdinal}`;
      throw new Error(msg);
    }

    if (eventOrdinal !== this.getNextEventOrdinal()) {
      const aggregateId = this.getAggregateId();
      throw new Error(`Applying non consecutive event (eventId: ${eventId}, ordinal: ${eventOrdinal}) to the aggregate (aggregateId: ${aggregateId}, maxOrdinal: ${this.maxEventOrdinal})`);
    }
  }

  /**
   * Use event ordinal to check if an event has been applied to the aggregate.
   * @param eventOrdinal
   * @returns boolean
   */
  isPastOrdinal(eventOrdinal: number): boolean {
    return eventOrdinal > 0 && !(this.maxEventOrdinal < eventOrdinal);
  }

  /**
   * Use eventCount if its great than 0 or use eventsTotal
   *
   * @returns number
   */
  getNextEventOrdinal(): number {
    return this.getMaxEventOrdinal() + 1;
  }

  getMaxEventOrdinal(): number {
    return this.maxEventOrdinal;
  }

  private setMaxEventOrdinal(maxEventOrdinal: number) {
    this.maxEventOrdinal = maxEventOrdinal;
  }

  getUseOptimisticLocking(): boolean {
    return this.useOptimisticLocking;
  }
}
