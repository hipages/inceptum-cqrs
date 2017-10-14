import { AggregateEventStore } from './event/store/AggregateEventStore';
import { AggregateEvent } from './event/AggregateEvent';
import { ExecutionContext } from './ExecutionContext';
import { Aggregate } from './Aggregate';
import { Command } from './command/Command';
import { AggregateCreatingEvent } from './event/AggregateCreatingEvent';

export class CQRS {
  aggregateEventStore: AggregateEventStore;
  aggregateClasses = new Map<string, Function>();

  /**
   * Construct a new instance of the CQRS framework
   * @param {AggregateEventStore} aggregateEventStore The event store to use.
   */
  constructor(aggregateEventStore: AggregateEventStore) {
    this.aggregateEventStore = aggregateEventStore;
  }
  newExecutionContext(): ExecutionContext {
    return new ExecutionContext(this.aggregateEventStore);
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
  getAggregate(aggregateId: string): Aggregate {
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
