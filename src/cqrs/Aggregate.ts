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
      if (aggregate.eventApplied(eventExecutor.getEventId(e))) {
        return;
      }

      eventExecutor.apply(e, aggregate);
      const eventId = eventExecutor.getEventId(e);
      aggregate.applyEvent(eventId);
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
  private eventsCounter: number; // number of events in aggregate
  private eventsApplied: string[];

  constructor(aggregateType: string, aggregateId: string) {
    this.aggregateType = aggregateType;
    this.aggregateId = aggregateId;
    this.aggregateRoles = new Map();
    this.eventsCounter = 0;
    this.eventsApplied = [];
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
   * Increate Event total by 1
   * Update event counter with event ordinal property if any
   *
   * @param event
   * @returns number
   */
  applyEvent(eventId: string): Aggregate {
    // if eventId has not been applied.
    if (!this.eventApplied(eventId)) {
      this.eventsCounter = this.eventsApplied.push(eventId);
    }

    return this;
  }

  eventApplied(eventId): boolean {
    return this.eventsApplied.indexOf(eventId) > -1;
  }

  /**
   * Use eventCount if its great than 0 or use eventsTotal
   *
   * @returns number
   */
  getNextEventOrdinal(): number {
    return this.eventsCounter + 1;
  }
}
