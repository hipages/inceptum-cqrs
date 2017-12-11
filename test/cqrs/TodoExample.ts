import { ExecutionContext } from '../../src/cqrs/ExecutionContext';
import { Aggregate } from '../../src/cqrs/Aggregate';
import { Event } from '../../src/cqrs/event/Event';
import { AggregateEventOptions } from '../../src/cqrs/event/AggregateEvent';
import { Command } from '../../src/cqrs/command/Command';
import { AggregateCommand } from '../../src/cqrs/command/AggregateCommand';
import { AggregateCreatingCommand } from '../../src/cqrs/command/AggregateCreatingCommand';
import { AggregateCreatingEvent, AggregateCreatingEventOptions } from '../../src/cqrs/event/AggregateCreatingEvent';
import { AggregateEvent } from '../../src/cqrs/event/AggregateEvent';
import { CommandExecutor } from '../../src/cqrs/command/CommandExecutor';

export class TodoAggregate extends Aggregate {
  title: string;
  description: string;
  status: string;
}

export type TodoCreatedEventOptions = AggregateCreatingEventOptions & {
  title: string,
  description: string,
  creator: string,
};

export class TodoCreatedEvent extends AggregateCreatingEvent {
  creator: string;
  description: string;
  title: string;
  constructor(obj: TodoCreatedEventOptions) {
    obj.aggregateType = 'Todo';
    super(obj);
    this.title = obj.title;
    this.description = obj.description;
    this.creator = obj.creator;
  }
  apply(aggregate: TodoAggregate) {
    aggregate.title = this.title;
    aggregate.description = this.description;
    aggregate.status = 'NotDone';
    aggregate.addAggregateRole(this.creator, ['creator']);
  }
}

Event.registerEventClass(TodoCreatedEvent);

export class TodoMarkedDoneEvent extends AggregateEvent {
  // tslint:disable-next-line:prefer-function-over-method
  apply(aggregate) {
    aggregate.status = 'Done';
  }
}

Event.registerEventClass(TodoMarkedDoneEvent);

export class CreateTodoCommand extends AggregateCreatingCommand {
  title: string;
  description: string;

  constructor(obj) {
    obj.aggregateType = 'Todo';
    super(obj);
    this.title = obj.title;
    this.description = obj.description;
    this.aggregateId = obj.aggregateId;
  }
}

export class CreateTodoCommandExecutor extends CommandExecutor<CreateTodoCommand, TodoAggregate> {
  // tslint:disable-next-line:prefer-function-over-method
  async doExecute(command: CreateTodoCommand, executionContext: ExecutionContext, aggregate) {
    await executionContext.commitEvent(new TodoCreatedEvent({
      aggregateId: command.getAggregateId(),
      issuerCommandId: command.getCommandId(),
      title: command.title,
      description: command.description,
      creator: command.getIssuerAuth().getFullId(),
    }));
  }
  // tslint:disable-next-line:prefer-function-over-method
  async validate(command: CreateTodoCommand) {
    if (!command.title) {
      throw new Error('Need to specify a title for the Todo');
    }
    if (!command.description) {
      throw new Error('Need to specify a description for the Todo');
    }
  }
  // tslint:disable-next-line:prefer-function-over-method
  async validateAuth(command: CreateTodoCommand) {
    if (command.issuerAuth.getType() !== 'user') {
      throw new Error(`Only users can execute this command. Provided auth for an entity of type ${command.issuerAuth.getType()}`);
    }
  }

  // tslint:disable-next-line:prefer-function-over-method
  public canExecute(command: Command): boolean {
    return command instanceof CreateTodoCommand;
  }
}

export class MarkTodoDoneCommand extends AggregateCommand {
}

export class MarkTodoDoneCommandExecutor extends CommandExecutor<MarkTodoDoneCommand, TodoAggregate> {
  // tslint:disable-next-line:prefer-function-over-method
  async doExecute(command: MarkTodoDoneCommand, executionContext: ExecutionContext, aggregate?: TodoAggregate) {
    await executionContext.commitEvent(new TodoMarkedDoneEvent({
      aggregateId: command.getAggregateId(),
      issuerCommandId: command.getCommandId(),
    }));
  }
  // tslint:disable-next-line:prefer-function-over-method
  async validateAuth(command: MarkTodoDoneCommand, executionContext: ExecutionContext, aggregate?: TodoAggregate) {
    const roles = command.getRolesForAggregate(aggregate);
    if (roles.indexOf('creator') < 0) {
      throw new Error('Only the creator of the Todo can mark it as done');
    }
  }
  // tslint:disable-next-line:prefer-function-over-method
  async validate(command: MarkTodoDoneCommand, executionContext: ExecutionContext, aggregate?: TodoAggregate) {
    if (aggregate.status !== 'NotDone') {
      throw new Error('Aggregate is not currently in NotDone');
    }
  }

  // tslint:disable-next-line:prefer-function-over-method
  public canExecute(command: Command): boolean {
    return command instanceof MarkTodoDoneCommand;
  }
}

Command.registerCommandClass(CreateTodoCommand);
Command.registerCommandClass(MarkTodoDoneCommand);
