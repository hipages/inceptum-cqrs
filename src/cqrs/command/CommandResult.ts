import { Command } from './Command';

export class CommandResult {
  replyObject: Object;
  subCommandResults: Array<CommandResult>;
  newAggregateType: string;
  newAggregateId: string;
  commandType: string;
  commandId: string;

  constructor(command: Command) {
    this.commandId = command.getCommandId();
    this.commandType = command.getCommandType();
    this.newAggregateId = null;
    this.newAggregateType = null;
    this.subCommandResults = [];
  }
  getCommandId(): string {
    return this.commandId;
  }
  getNewAggregateId(): string {
    return this.newAggregateId;
  }
  getNewAggregateType(): string {
    return this.newAggregateType;
  }
  setNewAggregate(newAggregateType: string, newAggregateId: string) {
    this.newAggregateType = newAggregateType;
    this.newAggregateId = newAggregateId;
  }
  hasNewAggregateId(): boolean {
    return !!this.newAggregateId;
  }
  getSubCommandResults(): Array<CommandResult> {
    return this.subCommandResults;
  }
  hasSubCommands(): boolean {
    return this.subCommandResults.length > 0;
  }
  /**
   * @param {CommandResult} commandResult
   */
  addSubcommandResult(commandResult: CommandResult) {
    this.subCommandResults.push(commandResult);
  }
  setReplyObject(replyObject: Object) {
    this.replyObject = replyObject;
  }
  getReplyObject(): Object {
    return this.replyObject;
  }
}
