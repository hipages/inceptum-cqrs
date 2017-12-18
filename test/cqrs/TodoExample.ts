import { EventExecutor } from '../../src/cqrs/event/EventExecutor';
import { ExecutionContext } from '../../src/cqrs/ExecutionContext';
import { Aggregate } from '../../src/cqrs/Aggregate';
import { Command } from '../../src/cqrs/command/Command';
import { AggregateCommand } from '../../src/cqrs/command/AggregateCommand';
import { AggregateCreatingCommand } from '../../src/cqrs/command/AggregateCreatingCommand';
import { CommandExecutor } from '../../src/cqrs/command/CommandExecutor';
import { CQRSAggregate, CQRSEventExecutor, CQRSCommand, CQRSCommandExecutor } from '../../src/cqrs/plugin/CQRSDecorators';

@CQRSAggregate
export class TodoAggregate extends Aggregate {
  static aggregateName = 'Todo';

  title: string;
  description: string;
  status: string;
}


export class TodoCreatedEvent {
  constructor(public title: string, public creator: string, public description: string, public aggregateId: string) {
  }
}

@CQRSEventExecutor
export class TodoCreatedEventExecutor extends EventExecutor<TodoCreatedEvent, TodoAggregate> {
  constructor() {
    super(true, 'aggregateId', 'Todo');
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

export class TodoMarkedDoneEvent {
  constructor(public aggregateId: string) {
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
