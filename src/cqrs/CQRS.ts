import { Stream } from 'stream';
import * as lruCache from 'lru-cache';
import { AutowireGroup, StartMethod, AutowireGroupDefinitions, SingletonDefinition, LogManager } from 'inceptum';
import { AggregateEventStore } from './event/store/AggregateEventStore';
import { ExecutionContext } from './ExecutionContext';
import { Aggregate } from './Aggregate';
import { Command } from './command/Command';
import { CommandExecutor } from './command/CommandExecutor';
import { EventExecutor } from './event/EventExecutor';

const MAX_AGGREGATE_CACHE_ENTRIES = 1000;
const MAX_AGGREGATE_CACHE_AGE = 1000 * 60 * 60; // one hour

const Logger = LogManager.getLogger(__filename);

class CacheInvalidatingAggregateEventStore extends AggregateEventStore {
  eventExecutors: EventExecutor<any, any>[];
  eventStream: Stream;
  cache: any;
  baseEventStore: AggregateEventStore;
  constructor(baseEventStore: AggregateEventStore, cache, eventStream: Stream, eventExecutors: EventExecutor<any, any>[]) {
    super();
    this.baseEventStore = baseEventStore;
    this.cache = cache;
    this.eventStream = eventStream;
    this.eventExecutors = eventExecutors;
  }
  async getEventsOf(aggregateId: string): Promise<any[]> {
    return await this.baseEventStore.getEventsOf(aggregateId);
  }
  async commitEvent(aggregateEvent: any): Promise<void> {
    const executor = EventExecutor.getEventExecutor(aggregateEvent, this.eventExecutors);
    if (!executor) {
      throw new Error(`Unknown event to commit ${aggregateEvent.constructor.name}`);
    }
    this.cache.del(executor.getAggregateId(aggregateEvent));
    await this.baseEventStore.commitEvent(aggregateEvent);
    this.eventStream.emit('event', aggregateEvent);
  }
  async commitAllEvents(aggregateEvents: any[]): Promise<void> {
    aggregateEvents.forEach((aggregateEvent) => {
      const executor = EventExecutor.getEventExecutor(aggregateEvent, this.eventExecutors);
      if (!executor) {
        throw new Error(`Unknown event to commit ${aggregateEvent.constructor.name}`);
      }
      this.cache.del(executor.getAggregateId(aggregateEvent));
    });
    await this.baseEventStore.commitAllEvents(aggregateEvents);
    aggregateEvents.forEach((aggregateEvent) => this.eventStream.emit('event', aggregateEvent));
  }
}

export class CQRS {
  aggregateEventStore: AggregateEventStore;
  commandClasses = new Map<string, Function>();
  aggregateClasses = new Map<string, Function>();
  aggregateCache: any;
  eventStream = new Stream();

  @AutowireGroup('cqrs:commandExecutor')
  commandExecutors: CommandExecutor<any, any>[] = [];

  @AutowireGroup('cqrs:eventExecutor')
  eventExecutors: EventExecutor<any, any>[] = [];

  @AutowireGroupDefinitions('cqrs:aggregate')
  aggregateDefinitionsToRegister: SingletonDefinition<any>[];

  @AutowireGroupDefinitions('cqrs:command')
  commandDefinitionsToRegister: SingletonDefinition<any>[];

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
  }

  /**
   * Construct a new instance of the CQRS framework
   * @param {AggregateEventStore} aggregateEventStore The event store to use.
   */
  constructor(aggregateEventStore: AggregateEventStore) {
    this.aggregateCache = lruCache({
      max: MAX_AGGREGATE_CACHE_ENTRIES,
      maxAge: MAX_AGGREGATE_CACHE_AGE,
    });
    this.aggregateEventStore = new CacheInvalidatingAggregateEventStore(aggregateEventStore, this.aggregateCache, this.eventStream, this.eventExecutors);
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
    const cachedAggregate = this.aggregateCache.get(aggregateId);
    if (cachedAggregate) {
      return cachedAggregate;
    }
    const aggregate = await this.getAggregateInternal(aggregateId);
    if (aggregate) {
      this.aggregateCache.set(aggregateId, aggregate);
    }
    return aggregate;
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
}
