
export class Aggregate {
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
}
