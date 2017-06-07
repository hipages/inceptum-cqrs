import { util } from 'inceptum';
import { Command } from './command/Command';
import { Aggregate } from './Aggregate';
import { AggregateEvent } from './event/AggregateEvent';
import { AggregateCommand } from './command/AggregateCommand';
import { AggregateEventStore } from './event/store/AggregateEventStore';
import { AggregateCreatingEvent } from './event/AggregateCreatingEvent';
import { AggregateCreatingCommand } from './command/AggregateCreatingCommand';
import { CommandResult } from './command/CommandResult';

export enum Status {
  NOT_COMMMITED,
  COMMITTING,
  COMMITTED,
}

export class ExecutionContext extends AggregateEventStore {
  committed = false;
  commandResults: Map<string, CommandResult>;
  error: Error;
  commandsToExecute: AggregateCommand[];
  eventsToEmit: AggregateEvent[];
  status: Status;
  aggregateEventStore: AggregateEventStore;
  /**
   * Constructs a new instance of ExecutionContext
   * @param {AggregateEventStore} aggregateEventStore The store to commit events to
   */
  constructor(aggregateEventStore: AggregateEventStore) {
    super();
    this.aggregateEventStore = aggregateEventStore;
    this.status = Status.NOT_COMMMITED;
    this.eventsToEmit = [];
    this.commandsToExecute = [];
    this.error = null;
    this.commandResults = new Map<string, CommandResult>();
    // this.aggregateCache = new Map();
  }
  /**
   * Saves an aggregate event to this execution context.
   * The events won't be really saved on the aggregateEventStore until all
   * commands have been executed and the execution has been successful.
   * @param {aggregateEvent} aggregateEvent The aggregate event to store
   */
  commitEvent(event: AggregateEvent): void {
    this.validateNotCommitted();
    if (event && (event instanceof AggregateEvent)) {
      this.eventsToEmit.push(event);
      // this.aggregateCache.delete(event.getAggregateId());
      return;
    }
    throw new Error('Provided event is not of type AggregateEvent');
  }
  /**
   * Adds a command to the queue of commands to be executed.
   * @param {AggregateCommand} aggregateCommand The command to add to the execution queue
   */
  addCommandToExecute(aggregateCommand: AggregateCommand) {
    this.validateNotCommitted();
    this.commandsToExecute.push(aggregateCommand);
  }
  /**
   * Validates that this execution context has not been committed yet.
   * @private
   */
  validateNotCommitted() {
    if (this.status >= Status.COMMITTED) {
      throw new Error('ExecutionContext is already committed. Can\'t perform additional actions');
    }
  }
  getAggregate(aggregateId) {
    // if (this.aggregateCache.has(aggregateId)) {
    //   return this.aggregateCache.get(aggregateId);
    // }
    const aggregateEvents = this.aggregateEventStore.getEventsOf(aggregateId) || [];
    const uncommittedEvents = this.getUncommittedEventsOf(aggregateId) || [];
    const allEvents = aggregateEvents.concat(uncommittedEvents);
    if (allEvents.length === 0) {
      return null;
    }
    const firstEvent = allEvents[0];
    if (!(firstEvent instanceof AggregateCreatingEvent)) {
      throw new Error(`The first event of aggregate ${aggregateId} is not an AggregateCreatingEvent. Panic!`);
    }
    const aggregate = new Aggregate((firstEvent as AggregateCreatingEvent).getAggregateType(), firstEvent.getAggregateId());
    allEvents.forEach((e) => e.apply(aggregate));
    return aggregate;
  }
  /**
   * Get all uncommitted events for the given aggregate id
   * @private
   * @param {string} aggregateId The id of the aggregate
   */
  getUncommittedEventsOf(aggregateId) {
    return this.eventsToEmit.filter((e) => e.getAggregateId() === aggregateId);
  }
  /**
   * Executes a single command. This is a convenience method that calls both {@link addCommandToExecute} and
   * {@link commit}
   * @param {AggregateCommand} command The command to execute
   */
  executeCommand(command) {
    this.validateNotCommitted();
    this.addCommandToExecute(command);
    this.commit();
  }
  /**
   * Commits the execution context.
   * This essentially will go through all commands pending execution and will call them in order. It will
   * fail on the first error that gets thrown by any of the commands, and this won't be able to be committed.
   */
  commit() {
    this.validateNotCommitted();
    if (this.status === Status.COMMITTING) {
      throw new Error('ExecutionContext is already committing. Don\'t call commit directly, just call addCommandToExecute');
    }
    this.status = Status.COMMITTING;
    while (this.commandsToExecute.length > 0) {
      const command = this.commandsToExecute.shift();
      const aggregate = (command instanceof AggregateCreatingCommand) ?
        new Aggregate(command.getAggregateType(), command.getAggregateId()) :
        this.getAggregate(command.getAggregateId());
      try {
        command.executeWithAggregate(this, aggregate);
      } catch (e) {
        this.committed = true;
        this.error = new util.ExtendedError(`There was an error executing command ${command}`, e);
        throw e;
      }
    }
    // All commands executed correctly
    this.status = Status.COMMITTED;
    try {
      this.aggregateEventStore.commitAllEvents(this.eventsToEmit);
    } catch (e) {
      this.error = new util.ExtendedError('There was an error saving events', e);
      throw e;
    }
  }
  getError() {
    return this.error;
  }
  hasCommandResultForCommand(command) {
    return this.commandResults.has(command);
  }
  getCommandResultForCommand(command) {
    if (this.commandResults.has(command)) {
      return this.commandResults.get(command);
    }
    const result = new CommandResult(command);
    this.commandResults.set(command, result);
    return result;
  }

   getEventsOf(aggregateId: string): Array<AggregateEvent> {
    return this.aggregateEventStore.getEventsOf(aggregateId);
  }
}