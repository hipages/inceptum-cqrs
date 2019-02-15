import { v1 } from 'uuid';
import { EventExecutor } from '../../src/cqrs/event/EventExecutor';
import { ExecutionContext } from '../../src/cqrs/ExecutionContext';
import { Aggregate } from '../../src/cqrs/Aggregate';
import { Command } from '../../src/cqrs/command/Command';
import { AggregateCommand } from '../../src/cqrs/command/AggregateCommand';
import { AggregateCreatingCommand } from '../../src/cqrs/command/AggregateCreatingCommand';
import { CommandExecutor } from '../../src/cqrs/command/CommandExecutor';
import { CQRSAggregate, CQRSEventExecutor, CQRSCommand, CQRSCommandExecutor } from '../../src/cqrs/plugin/CQRSDecorators';
import { EventExecutorNoLock } from '../../src/cqrs/event/EventExecutorNoLock';

@CQRSAggregate
export class TodoAggregate extends Aggregate {

  protected useOptimisticLocking = true;
  static aggregateName = 'Todo';

  title: string;
  description: string;
  status: string;

  setUseOptimisticLocking(use: boolean): void {
    this.useOptimisticLocking = use;
  }
}

export class TodoEvent {
  eventId: string;
  ordinal: number;

  constructor() {
    this.eventId = v1();
  }
}

export class TodoCreatedEvent extends TodoEvent {
  constructor(public title: string, public creator: string, public description: string, public aggregateId: string) {
    super();
  }
}

@CQRSEventExecutor
export class TodoCreatedEventExecutor extends EventExecutor<TodoCreatedEvent, TodoAggregate> {
  constructor() {
    super(true, 'aggregateId', 'Todo');
  }

  getEventId(e: TodoCreatedEvent) {
    return e.eventId;
  }

  setEventOrdinal(e: TodoCreatedEvent, n: number) {
    e.ordinal = n;
  }

  getEventOrdinal(e: TodoCreatedEvent) {
    return e.ordinal;
  }

  public canExecute(event: any): boolean {
    return event instanceof TodoCreatedEvent;
  }

  public apply(event: TodoCreatedEvent, aggregate: TodoAggregate) {
      aggregate.title = event.title;
      aggregate.description = event.description;
      aggregate.status = 'NotDone';
      aggregate.addAggregateRole(event.creator, ['creator']);
  }
}

export class TodoMarkedDoneEvent extends TodoEvent {
  constructor(public aggregateId: string) {
    super();
  }
}

@CQRSEventExecutor
export class TodoMarkedDoneEventExecutor extends EventExecutor<TodoMarkedDoneEvent, TodoAggregate> {
  constructor() {
    super(false, 'aggregateId');
  }
  public canExecute(event: any): boolean {
    return event instanceof TodoMarkedDoneEvent;
  }

  getEventId(e: TodoMarkedDoneEvent): string {
    return e.eventId;
  }

  setEventOrdinal(e: TodoMarkedDoneEvent, n: number) {
    e.ordinal = n;
  }

  getEventOrdinal(e: TodoMarkedDoneEvent) {
    return e.ordinal;
  }

  public apply(event: TodoMarkedDoneEvent, aggregate: TodoAggregate) {
    aggregate.status = 'Done';
  }
}

@CQRSEventExecutor
export class TodoMarkedDoneNoLockingEventExecutor extends EventExecutorNoLock<TodoMarkedDoneEvent, TodoAggregate> {
  constructor() {
    super(false, 'aggregateId');
  }
  public canExecute(event: any): boolean {
    return event instanceof TodoMarkedDoneEvent;
  }

  getEventId(e: TodoMarkedDoneEvent): string {
    return e.eventId;
  }

  public apply(event: TodoMarkedDoneEvent, aggregate: TodoAggregate) {
    aggregate.status = 'Done';
  }
}

@CQRSCommand
export class CreateTodoCommand extends AggregateCreatingCommand {
  title: string;
  description: string;

  constructor(obj: any = {}) {
    obj.aggregateType = 'Todo';
    super(obj);
    this.title = obj.title;
    this.description = obj.description;
    this.aggregateId = obj.aggregateId;
  }
}

@CQRSCommandExecutor
export class CreateTodoCommandExecutor extends CommandExecutor<CreateTodoCommand, TodoAggregate> {
  async doExecute(command: CreateTodoCommand, executionContext: ExecutionContext, aggregate) {
    await executionContext.commitEvent(new TodoCreatedEvent(
      command.title,
      command.getIssuerAuth().getFullId(),
      command.description,
      command.getAggregateId(),
    ));
  }
  async validate(command: CreateTodoCommand) {
    if (!command.title) {
      throw new Error('Need to specify a title for the Todo');
    }
    if (!command.description) {
      throw new Error('Need to specify a description for the Todo');
    }
  }
  async validateAuth(command: CreateTodoCommand) {
    if (command.issuerAuth.getType() !== 'user') {
      throw new Error(`Only users can execute this command. Provided auth for an entity of type ${command.issuerAuth.getType()}`);
    }
  }

  public canExecute(command: Command): boolean {
    return command instanceof CreateTodoCommand;
  }
}

@CQRSCommand
export class MarkTodoDoneCommand extends AggregateCommand {
}

@CQRSCommandExecutor
export class MarkTodoDoneCommandExecutor extends CommandExecutor<MarkTodoDoneCommand, TodoAggregate> {
  async doExecute(command: MarkTodoDoneCommand, executionContext: ExecutionContext, aggregate?: TodoAggregate) {
    await executionContext.commitEvent(new TodoMarkedDoneEvent(
      command.getAggregateId(),
    ));
  }
  async validateAuth(command: MarkTodoDoneCommand, executionContext: ExecutionContext, aggregate?: TodoAggregate) {
    const roles = command.getRolesForAggregate(aggregate);
    if (roles.indexOf('creator') < 0) {
      throw new Error('Only the creator of the Todo can mark it as done');
    }
  }
  async validate(command: MarkTodoDoneCommand, executionContext: ExecutionContext, aggregate?: TodoAggregate) {
    if (aggregate.status !== 'NotDone') {
      throw new Error('Aggregate is not currently in NotDone');
    }
  }

  public canExecute(command: Command): boolean {
    return command instanceof MarkTodoDoneCommand;
  }
}
