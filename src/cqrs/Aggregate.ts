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
      if (eventExecutor) {
        eventExecutor.apply(e, aggregate);
      } else {
        throw new Error(`Unknown event during getAggregate: ${firstEvent.constructor.name}`);
      }
    });
    return aggregate;
  }

  public static instantiateAggregate(aggregateType: string, aggregateId: string, aggregateClasses: Map<string, Function>): Aggregate {
    const aggregateClass = aggregateClasses.has(aggregateType) ? aggregateClasses.get(aggregateType) : Aggregate;
    return new (aggregateClass as any)(aggregateType, aggregateId);
  }

  private aggregateRoles: Map<string, Array<string>>;
  aggregateId: string;
  aggregateType: string;
  constructor(aggregateType: string, aggregateId: string) {
    this.aggregateType = aggregateType;
    this.aggregateId = aggregateId;
    this.aggregateRoles = new Map();
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
}
