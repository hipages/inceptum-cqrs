
export type RolesObj = {
  [key: string]: string[]
}

/**
 * A class that represents both authentication and authorisation. Meaning that it
 * both serves to identify what is performing an action, and what permissions it has.
 */
export class Auth {
  extraRoles: RolesObj;
  roles: string[];
  id: string;
  type: string;
  /**
   * Construct an Auth object
   * @param {string} type The type of entity that this Auth represents. e.g. 'user', 'cron', etc
   * @param {string} id The identification of the entity. e.g. In the case of a user, this is the user id
   * @param {string[]} roles A list of the roles that this entity has
   * @param {object} extraRoles A list of extra roles that this Auth provides for a specific entity. e.g.
   * {"<AGGREG_TYPE>:<AGGREG_ID>": ["role1", "role2"], "module:<MODULE_ID>": [ "role3", "role4"] }
   */
  constructor(type:string, id: string, roles:Array<string> = [], extraRoles: RolesObj = {}) {
    this.type = type;
    this.id = id;
    this.roles = roles;
    this.extraRoles = extraRoles;
  }

  getType(): string {
    return this.type;
  }
  getId(): string {
    return this.id;
  }
  getFullId(): string {
    return `${this.type}:${this.id}`;
  }
  /**
   * Returns the roles of this entity. In the case that an entity is provided, it will also
   * include any extra roles that it may have re: that entity.
   * @param {[string]} forEntity An optional entity that we want to check roles for
   */
  getRoles(forEntity?: string): Array<string> {
    if ((!forEntity)
      || !(Object.hasOwnProperty.call(this.extraRoles, forEntity))) {
      return this.roles;
    }
    const allRoles = new Set(this.roles);
    this.extraRoles[forEntity].forEach((r) => allRoles.add(r));
    return Array.from(allRoles);
  }
  getExtraRoles(): RolesObj {
    return this.extraRoles;
  }
}
