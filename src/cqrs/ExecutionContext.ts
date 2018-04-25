import * as stringify from 'json-stringify-safe';
import { ExtendedError } from 'inceptum';
import { CommandExecutor } from './command/CommandExecutor';
import { Command } from './command/Command';
import { Aggregate } from './Aggregate';
import { AggregateCommand } from './command/AggregateCommand';
import { AggregateEventStore } from './event/store/AggregateEventStore';
import { AggregateCreatingCommand } from './command/AggregateCreatingCommand';
import { CommandResult } from './command/CommandResult';
import { ReturnToCallerError } from './error/ReturnToCallerError';
import { EventExecutor } from './event/EventExecutor';

export enum Status {
  NOT_COMMMITED,
  COMMITTING,
  COMMITTED,
}

export class ExecutionContext extends AggregateEventStore {
  eventExecutors: EventExecutor<any, any>[];
  commandExecutors: CommandExecutor<any, any>[];
  commandResults: Map<string, CommandResult>;
  error: Error;
  commandsToExecute: AggregateCommand[];
  eventsToEmit: Object[];
  status: Status;
  aggregateEventStore: AggregateEventStore;
  aggregateClasses = new Map<string, Function>();
  aggregateEventsStoreCache: Map<string, any[]>;
  /**
   * Constructs a new instance of ExecutionContext
   * @param {AggregateEventStore} aggregateEventStore The store to commit events to
   */
  constructor(aggregateEventStore: AggregateEventStore, commandExecutors: CommandExecutor<any, any>[], eventExecutors: EventExecutor<any, any>[]) {
    super();
    this.aggregateEventStore = aggregateEventStore;
    this.status = Status.NOT_COMMMITED;
    this.eventsToEmit = [];
    this.commandsToExecute = [];
    this.error = null;
    this.commandResults = new Map<string, CommandResult>();
    this.commandExecutors = commandExecutors;
    this.eventExecutors = eventExecutors;
    this.aggregateEventsStoreCache = new Map<string, any[]>();
  }
  /**
   * Saves an aggregate event to this execution context.
   * The events won't be really saved on the aggregateEventStore until all
   * commands have been executed and the execution has been successful.
   * @param {aggregateEvent} aggregateEvent The aggregate event to store
   */
  async commitEvent(event: any): Promise<void> {
    this.validateNotCommitted();
    this.eventsToEmit.push(event);
  }
  /**
   * Adds a command to the queue of commands to be executed.
   * @param {AggregateCommand} aggregateCommand The command to add to the execution queue
   */
  addCommandToExecute(aggregateCommand: AggregateCommand) {
    this.validateNotCommitted();
    if (this.commandExecutors.findIndex((executor) => executor.canExecute(aggregateCommand)) < 0) {
      throw new Error(`Unknown command type: ${aggregateCommand.constructor.name}. There's no CommandExecutor registered for it`);
    }
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
  private async getAggregateEventsFromStore(aggregateId: string): Promise<any[]> {
    const cached = this.aggregateEventsStoreCache.get(aggregateId);
    if (cached) {
      return cached;
    }
    const events = (await this.aggregateEventStore.getEventsOf(aggregateId)) || [];
    this.aggregateEventsStoreCache.set(aggregateId, events);
    return events;
  }
  async getAggregate(aggregateId): Promise<Aggregate> {
    const aggregateEvents = await this.getAggregateEventsFromStore(aggregateId);
    const uncommittedEvents = this.getUncommittedEventsOf(aggregateId) || [];
    const allEvents = aggregateEvents.concat(uncommittedEvents);
    if (allEvents.length === 0) {
      return null;
    }
    return Aggregate.applyEvents(allEvents, this.eventExecutors, this.aggregateClasses);
  }

  protected applyUncommitedEvents(aggregate: Aggregate) {
    const uncommittedEvents = this.getUncommittedEventsOf(aggregate.aggregateId) || [];
    uncommittedEvents.forEach((e) => {
      const eventExecutor = EventExecutor.getEventExecutor(e, this.eventExecutors);
      if (!aggregate.eventApplied(eventExecutor, e)) {
        Aggregate.applyEventOnAggregate(e, eventExecutor, aggregate);
      }
    });
    return aggregate;
  }

  /**
   * Get all uncommitted events for the given aggregate id
   * @private
   * @param {string} aggregateId The id of the aggregate
   */
  getUncommittedEventsOf(aggregateId) {
    return this.eventsToEmit.filter((e) => EventExecutor.getEventExecutor(e, this.eventExecutors).getAggregateId(e) === aggregateId);
  }

  /**
   * Executes a single command. This is a convenience method that calls both {@link addCommandToExecute} and
   * {@link commit}
   * @param {AggregateCommand} command The command to execute
   */
  async executeCommand(...commands) {
    this.validateNotCommitted();
    commands.forEach((command) => {
      this.addCommandToExecute(command);
    });
    await this.commit();
  }
  /**
   * Commits the execution context.
   * This essentially will go through all commands pending execution and will call them in order. It will
   * fail on the first error that gets thrown by any of the commands, and this won't be able to be committed.
   */
  async commit() {
    this.validateNotCommitted();
    if (this.status === Status.COMMITTING) {
      throw new Error('ExecutionContext is already committing. Don\'t call commit directly, just call addCommandToExecute');
    }
    this.status = Status.COMMITTING;
    while (this.commandsToExecute.length > 0) {
      const command = this.commandsToExecute.shift();
      const commandExecutor = this.commandExecutors.find((executor) => executor.canExecute(command));
      const aggregate = (command instanceof AggregateCreatingCommand) ?
        Aggregate.instantiateAggregate(command.getAggregateType(), command.getAggregateId(), this.aggregateClasses) :
        await this.getAggregate(command.getAggregateId());
      try {
        await commandExecutor.execute(command, this, aggregate);
      } catch (e) {
        this.status = Status.COMMITTED;
        if (e instanceof ReturnToCallerError) {
          // return the error to the caller
          this.error = e;
        } else {
          // hide the actual error and return a custom error
          this.error = new ExtendedError(`There was an error executing command ${stringify(command)}`, e);
        }
        throw this.error;
      }

      // apply events to aggregate
      this.applyUncommitedEvents(aggregate);
    }

    // All commands executed correctly
    this.status = Status.COMMITTED;

    try {
      await this.aggregateEventStore.commitAllEvents(this.eventsToEmit);
    } catch (e) {
      if (e instanceof ReturnToCallerError) {
        // return the error to the caller
        this.error = e;
      } else {
        // hide the actual error and return a custom error
        this.error = new ExtendedError('There was an error saving events', e);
      }
      throw this.error;
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

  async getEventsOf(aggregateId: string): Promise<Array<any>> {
    return await this.aggregateEventStore.getEventsOf(aggregateId);
  }
  setAggregateClasses(aggregateClasses: Map<string, Function>) {
    this.aggregateClasses = aggregateClasses;
  }
}
