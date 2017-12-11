import { Stream } from 'stream';
import * as lruCache from 'lru-cache';
import { AggregateEventStore } from './event/store/AggregateEventStore';
import { AggregateEvent } from './event/AggregateEvent';
import { ExecutionContext } from './ExecutionContext';
import { Aggregate } from './Aggregate';
import { Command } from './command/Command';
import { AggregateCreatingEvent } from './event/AggregateCreatingEvent';
import { CommandExecutor } from './command/CommandExecutor';

const MAX_AGGREGATE_CACHE_ENTRIES = 1000;
const MAX_AGGREGATE_CACHE_AGE = 1000 * 60 * 60; // one hour
class CacheInvalidatingAggregateEventStore extends AggregateEventStore {
  eventStream: Stream;
  cache: any;
  baseEventStore: AggregateEventStore;
  constructor(baseEventStore: AggregateEventStore, cache, eventStream: Stream) {
    super();
    this.baseEventStore = baseEventStore;
    this.cache = cache;
    this.eventStream = eventStream;
  }
  async getEventsOf(aggregateId: string): Promise<AggregateEvent[]> {
    return await this.baseEventStore.getEventsOf(aggregateId);
  }
  async commitEvent(aggregateEvent: AggregateEvent): Promise<void> {
    this.cache.del(aggregateEvent.getAggregateId());
    await this.baseEventStore.commitEvent(aggregateEvent);
    this.eventStream.emit('event', aggregateEvent);
  }
  async commitAllEvents(aggregateEvents: AggregateEvent[]): Promise<void> {
    aggregateEvents.forEach((aggregateEvent) => this.cache.del(aggregateEvent.getAggregateId()));
    await this.baseEventStore.commitAllEvents(aggregateEvents);
    aggregateEvents.forEach((aggregateEvent) => this.eventStream.emit('event', aggregateEvent));
  }
}

export class CQRS {
  aggregateEventStore: AggregateEventStore;
  aggregateClasses = new Map<string, Function>();
  aggregateCache: any;
  eventStream = new Stream();
  commandExecutors: CommandExecutor<any, any>[] = [];

  /**
   * Construct a new instance of the CQRS framework
   * @param {AggregateEventStore} aggregateEventStore The event store to use.
   */
  constructor(aggregateEventStore: AggregateEventStore) {
    this.aggregateCache = lruCache({
      max: MAX_AGGREGATE_CACHE_ENTRIES,
      maxAge: MAX_AGGREGATE_CACHE_AGE,
    });
    this.aggregateEventStore = new CacheInvalidatingAggregateEventStore(aggregateEventStore, this.aggregateCache, this.eventStream);
  }
  newExecutionContext(): ExecutionContext {
    const execContext = new ExecutionContext(this.aggregateEventStore, this.commandExecutors);
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
    const firstEvent = allEvents[0];
    if (!(firstEvent instanceof AggregateCreatingEvent)) {
      throw new Error(`The first event of aggregate ${aggregateId} is not an AggregateCreatingEvent. Panic!`);
    }
    const aggregate = this.instantiateAggregate(firstEvent.getAggregateType(), firstEvent.getAggregateId());
    allEvents.forEach((e) => e.apply(aggregate));
    return aggregate;
  }
  static deserialiseCommand<T extends Command>(obj, commandType): T {
    return Command.fromObject(obj, commandType) as T;
  }
  registerAggregateClass(name: string, aggregateClass: Function) {
    this.aggregateClasses.set(name, aggregateClass);
  }
  private instantiateAggregate(aggregateType: string, aggregateId: string): Aggregate {
    const aggregateClass = this.aggregateClasses.has(aggregateType) ? this.aggregateClasses.get(aggregateType) : Aggregate;
    return new (aggregateClass as any)(aggregateType, aggregateId);
  }
  public registerCommandExecutor<T extends Command, A extends Aggregate>(commandExecutor: CommandExecutor<T, A>) {
    this.commandExecutors.push(commandExecutor);
  }
}
