import * as lruCache from 'lru-cache';
import { AggregateEventStore } from './event/store/AggregateEventStore';
import { AggregateEvent } from './event/AggregateEvent';
import { ExecutionContext } from './ExecutionContext';
import { Aggregate } from './Aggregate';
import { Command } from './command/Command';
import { AggregateCreatingEvent } from './event/AggregateCreatingEvent';

const MAX_AGGREGATE_CACHE_ENTRIES = 1000;
const MAX_AGGREGATE_CACHE_AGE = 1000 * 60 * 60; // one hour
class CacheInvalidatingAggregateEventStore extends AggregateEventStore {
  cache: any;
  baseEventStore: AggregateEventStore;
  constructor(baseEventStore: AggregateEventStore, cache) {
    super();
    this.baseEventStore = baseEventStore;
    this.cache = cache;
  }
  async getEventsOf(aggregateId: string): Promise<AggregateEvent[]> {
    return await this.baseEventStore.getEventsOf(aggregateId);
  }
  async commitEvent(aggregateEvent: AggregateEvent): Promise<void> {
    this.cache.del(aggregateEvent.getAggregateId());
    await this.baseEventStore.commitEvent(aggregateEvent);
  }
}

export class CQRS {
  aggregateEventStore: AggregateEventStore;
  aggregateClasses = new Map<string, Function>();
  aggregateCache: any;

  /**
   * Construct a new instance of the CQRS framework
   * @param {AggregateEventStore} aggregateEventStore The event store to use.
   */
  constructor(aggregateEventStore: AggregateEventStore) {
    this.aggregateCache = lruCache({
      max: MAX_AGGREGATE_CACHE_ENTRIES,
      maxAge: MAX_AGGREGATE_CACHE_AGE,
    });
    this.aggregateEventStore = new CacheInvalidatingAggregateEventStore(aggregateEventStore, this.aggregateCache);
  }
  newExecutionContext(): ExecutionContext {
    const execContext = new ExecutionContext(this.aggregateEventStore);
    execContext.setAggregateClasses(this.aggregateClasses);
    return execContext;
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
}
