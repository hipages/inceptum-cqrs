import { EventExecutor } from './event/EventExecutor';

export class Aggregate {
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

  public static applyEventOnAggregate(e: Object, eventExecutor: EventExecutor<any, any>, aggregate: Aggregate) {
    if (eventExecutor) {
      aggregate.applyEventOrdinal(eventExecutor, e);
      // applying event data to aggregate data.
      eventExecutor.apply(e, aggregate);
    } else {
      throw new Error(`Unknown event during getEventExecutor: ${e.constructor.name}`);
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
   * Apply event ordinal to aggregate max event ordinal.
   * Repair event ordinal if it is 0.
   *
   * @param event
   * @returns number
   */
  applyEventOrdinal(eventExecutor: EventExecutor<any, any>, event: any): Aggregate {
    // read repair event ordinal if ordinal is 0.
    eventExecutor.updateEventOrdinal(event, this);

    // if event has not applied ordinal.
    if (this.eventApplied(eventExecutor, event)) {
      const eventUuid = eventExecutor.getEventId(event);
      const aggregateId = this.getAggregateId();
      const msg = `event (${eventUuid}) has already been applied to aggregate (${aggregateId}). Its current maxOrdinal is ${this.maxEventOrdinal}`;
      throw new Error(msg);
    }

    const eventOrdinal: number = eventExecutor.getEventOrdinal(event);
    if ((eventOrdinal - this.maxEventOrdinal) !== 1) {
      const eventId = eventExecutor.getEventId(event);
      const aggregateId = this.getAggregateId();
      throw new Error(`Appying non consecutive event(${eventId})(ordinal: ${eventOrdinal}) to the aggregate(${aggregateId})(maxOrdinal: ${this.maxEventOrdinal})`);
    }

    this.maxEventOrdinal = eventOrdinal;
    return this;
  }

  /**
   * Use event ordinal to check if an event has been applied to the aggregate.
   * @param eventOrdinal
   * @returns boolean
   */
  eventApplied(eventExecutor: EventExecutor<any, any>, event: any): boolean {
    const ec = eventExecutor.getEventOrdinal(event);
    return ec > 0 && !(this.maxEventOrdinal < ec);
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
}
