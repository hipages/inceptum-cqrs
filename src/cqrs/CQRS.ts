import { Stream } from 'stream';
import { AutowireGroup, StartMethod, AutowireGroupDefinitions, SingletonDefinition, LogManager, AutowireConfig, ExtendedError } from 'inceptum';
import { AggregateEventStore } from './event/store/AggregateEventStore';
import { ExecutionContext } from './ExecutionContext';
import { Aggregate } from './Aggregate';
import { Command } from './command/Command';
import { CommandExecutor } from './command/CommandExecutor';
import { EventExecutor } from './event/EventExecutor';
import { EventExecutorNoLocking } from './event/EventExecutorNoLocking';

const MAX_AGGREGATE_CACHE_ENTRIES = 1000;
const MAX_AGGREGATE_CACHE_AGE = 1000 * 60 * 60; // one hour

const Logger = LogManager.getLogger(__filename);

class NotifyingAggregateEventStore extends AggregateEventStore {
  baseEventStore: AggregateEventStore;
  cqrs: CQRS;

  constructor(baseEventStore: AggregateEventStore, cqrs: CQRS) {
    super();
    this.baseEventStore = baseEventStore;
    this.cqrs = cqrs;
  }
  async getEventsOf(aggregateId: string): Promise<any[]> {
    return await this.baseEventStore.getEventsOf(aggregateId);
  }
  async commitEvent(aggregateEvent: any): Promise<void> {
    if (!this.cqrs.hasExecutorForEvent(aggregateEvent)) {
      throw new Error(`Unknown event to commit ${aggregateEvent.constructor.name}`);
    }
    await this.baseEventStore.commitEvent(aggregateEvent);
    await this.cqrs.notifyEventListeners(aggregateEvent);
  }
  async commitAllEvents(aggregateEvents: any[]): Promise<void> {
    for (const aggregateEvent of aggregateEvents) {
      if (!this.cqrs.hasExecutorForEvent(aggregateEvent)) {
        throw new Error(`Unknown event to commit ${aggregateEvent.constructor.name}`);
      }
    }
    await this.baseEventStore.commitAllEvents(aggregateEvents);
    for (const aggregateEvent of aggregateEvents) {
      await this.cqrs.notifyEventListeners(aggregateEvent);
    }
      }
  }

export abstract class EventListener {
  abstract async eventCommitted(event: any);
}

export class CQRS {
  private aggregateEventStore: NotifyingAggregateEventStore;
  commandClasses = new Map<string, Function>();
  aggregateClasses = new Map<string, Function>();
  eventStream = new Stream();

  @AutowireGroup('cqrs:commandExecutor')
  commandExecutors: CommandExecutor<any, any>[] = [];

  @AutowireGroup('cqrs:eventExecutor')
  eventExecutors: EventExecutor<any, any>[] = [];

  @AutowireGroupDefinitions('cqrs:aggregate')
  aggregateDefinitionsToRegister: SingletonDefinition<any>[];

  @AutowireGroupDefinitions('cqrs:command')
  commandDefinitionsToRegister: SingletonDefinition<any>[];

  @AutowireGroup('cqrs:eventListener')
  eventListeners: EventListener[] = [];

  @AutowireConfig('Application.UseOptimisticLocking')
  useOptimisticLocking: boolean;

  @StartMethod
  private doSetup() {
    if (this.aggregateDefinitionsToRegister && this.aggregateDefinitionsToRegister.length > 0) {
      this.aggregateDefinitionsToRegister.forEach((def) => {
        const name = def.getProducedClass().aggregateName;
        if (!name) {
          throw new Error(`Class ${def.getProducedClass().constructor.name} is marked as an Aggregate, but it doesn't have a static property called aggregateName`);
        }
        this.registerAggregateClass(name, def.getProducedClass());
      });
    }
    this.aggregateDefinitionsToRegister = null;
    if (this.commandDefinitionsToRegister && this.commandDefinitionsToRegister.length > 0) {
      this.commandDefinitionsToRegister.forEach((def) => {
        const name = def.getProducedClass().name;
        this.registerCommandClass(name, def.getProducedClass());
      });
    }
    this.commandDefinitionsToRegister = null;
    this.validateEventExecutors();
  }

  /**
   * Construct a new instance of the CQRS framework
   * @param {AggregateEventStore} aggregateEventStore The event store to use.
   */
  constructor(aggregateEventStore: AggregateEventStore) {
    this.aggregateEventStore = new NotifyingAggregateEventStore(aggregateEventStore, this);
  }
  newExecutionContext(): ExecutionContext {
    const execContext = new ExecutionContext(this.aggregateEventStore, this.commandExecutors, this.eventExecutors);
    execContext.setAggregateClasses(this.aggregateClasses);
    return execContext;
  }

  getEventStream(): Stream {
    return this.eventStream;
  }

  /**
   * Executes a single command and return the ExecutionContext
   * @param {Command[]} commands The command to execute
   * @returns {ExecutionContext} The execution context of the command
   */
  async executeCommand(...commands: Command[]): Promise<ExecutionContext> {
    const executionContext = this.newExecutionContext();
    await executionContext.executeCommand(...commands);
    return executionContext;
  }
  async getAggregateAs<T extends Aggregate>(aggregateId: string): Promise<T> {
    return (await this.getAggregate(aggregateId)) as T;
  }
  async getAggregate(aggregateId: string): Promise<Aggregate> {
    return await this.getAggregateInternal(aggregateId);
  }
  private async getAggregateInternal(aggregateId: string): Promise<Aggregate> {
    const allEvents = await this.aggregateEventStore.getEventsOf(aggregateId);
    if (!allEvents || allEvents.length === 0) {
      return null;
    }
    return Aggregate.applyEvents(allEvents, this.eventExecutors, this.aggregateClasses);
  }
  deserialiseCommand<T extends Command>(obj, commandType): T {
    if (!commandType && !Object.hasOwnProperty.call(obj, Command.commandFieldType)) {
      throw new Error(`Can't deserialise object into typed instance because it doesn't have a ${Command.commandFieldType} field`);
    }
    const type = commandType || obj[Command.commandFieldType];
    if (!this.commandClasses.has(type)) {
      throw new Error(`Unknown command type ${type}`);
    }
    const typeConstructor = this.commandClasses.get(type);
    return Reflect.construct(typeConstructor, [obj]);
  }
  registerAggregateClass(name: string, aggregateClass: Function) {
    Logger.info(`Registering aggregate ${name}`);
    this.aggregateClasses.set(name, aggregateClass);
  }

  registerCommandClass(name: string, commandClass: Function) {
    Logger.info(`Registering command ${name}`);
    this.commandClasses.set(name, commandClass);
  }
  private instantiateAggregate(aggregateType: string, aggregateId: string): Aggregate {
    const aggregateClass = this.aggregateClasses.has(aggregateType) ? this.aggregateClasses.get(aggregateType) : Aggregate;
    return new (aggregateClass as any)(aggregateType, aggregateId);
  }
  public registerCommandExecutor<T extends Command, A extends Aggregate>(commandExecutor: CommandExecutor<T, A>) {
    this.commandExecutors.push(commandExecutor);
  }
  public registerEventExecutor<E, A extends Aggregate>(eventExecutor: EventExecutor<E, A>) {
    this.eventExecutors.push(eventExecutor);
  }
  async notifyEventListeners(aggregateEvent: any) {
    this.eventStream.emit('event', aggregateEvent);
    await this.eventListeners.reduce(async (prevPromise, eventListener: EventListener) => {
      await prevPromise;
      try {
        await eventListener.eventCommitted(aggregateEvent);
      } catch (e) {
        Logger.error(e, 'There was an error in event listener');
      }
    }, Promise.resolve());
  }
  hasExecutorForEvent(event: any) {
    return !!EventExecutor.getEventExecutor(event, this.eventExecutors);
  }

  validateEventExecutors(): boolean {
    for (const e of this.eventExecutors) {
      const valid = this.useOptimisticLocking ? e instanceof EventExecutor && !(e instanceof EventExecutorNoLocking) : e instanceof EventExecutorNoLocking;
      if (!valid) {
        let msg = `${e.constructor.name} is not an instance of EventExecutorNoLocking.`;
        if (this.useOptimisticLocking) {
          msg = `${e.constructor.name} should be an instance of EventExecutor instead of EventExecutorNoLocking.`;
        }
        throw new ExtendedError(msg);
      }
    }
    return true;
  }
}

