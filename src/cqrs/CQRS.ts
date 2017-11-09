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
  getEventsOf(aggregateId: string): AggregateEvent[] {
    return this.baseEventStore.getEventsOf(aggregateId);
  }
  commitEvent(aggregateEvent: AggregateEvent): void {
    this.cache.del(aggregateEvent.getAggregateId());
    this.baseEventStore.commitEvent(aggregateEvent);
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
   * @param {Command} The command to execute
   * @returns {ExecutionContext} The execution context of the command
   */
  executeCommand(command: Command) {
    const executionContext = this.newExecutionContext();
    executionContext.executeCommand(command);
    return executionContext;
  }
  getAggregateAs<T extends Aggregate>(aggregateId: string): T {
    return this.getAggregate(aggregateId) as T;
  }
  getAggregate(aggregateId: string): Aggregate {
    const cachedAggregate = this.aggregateCache.get(aggregateId);
    if (cachedAggregate) {
      return cachedAggregate;
    }
    const aggregate = this.getAggregateInternal(aggregateId);
    if (aggregate) {
      this.aggregateCache.set(aggregateId, aggregate);
    }
    return aggregate;
  }
  private getAggregateInternal(aggregateId: string): Aggregate {
    const allEvents = this.aggregateEventStore.getEventsOf(aggregateId);
    if (!allEvents || allEvents.length === 0) {
      return null;
    }
    const firstEvent = allEvents[0];
    if (!(firstEvent instanceof AggregateCreatingEvent)) {
      throw new Error(`The first event of aggregate ${aggregateId} is not an AggregateCreatingEvent. Panic!`);
    }
    const aggregateType = firstEvent.getAggregateType();
    const aggregateClass = this.aggregateClasses.has(aggregateType) ? this.aggregateClasses.get(aggregateType) : Aggregate;
    const aggregate = new (aggregateClass as any)(firstEvent.getAggregateType(), firstEvent.getAggregateId());
    allEvents.forEach((e) => e.apply(aggregate));
    return aggregate;
  }
  static deserialiseCommand<T extends Command>(obj, commandType): T {
    return Command.fromObject(obj, commandType) as T;
  }
  registerAggregateClass(name: string, aggregateClass: Function) {
    this.aggregateClasses.set(name, aggregateClass);
  }
}
