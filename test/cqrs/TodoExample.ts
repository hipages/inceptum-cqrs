import { Aggregate } from '../../src/cqrs/Aggregate';
import { Event } from '../../src/cqrs/event/Event';
import { AggregateEventOptions } from '../../src/cqrs/event/AggregateEvent';
import { Command } from '../../src/cqrs/command/Command';
import { AggregateCommand } from '../../src/cqrs/command/AggregateCommand';
import { AggregateCreatingCommand } from '../../src/cqrs/command/AggregateCreatingCommand';
import { AggregateCreatingEvent, AggregateCreatingEventOptions } from '../../src/cqrs/event/AggregateCreatingEvent';
import { AggregateEvent } from '../../src/cqrs/event/AggregateEvent';

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
  doExecuteWithAggregate(executionContext, aggregate) {
    executionContext.commitEvent(new TodoCreatedEvent({
      aggregateId: this.getAggregateId(),
      issuerCommandId: this.getCommandId(),
      title: this.title,
      description: this.description,
      creator: this.getIssuerAuth().getFullId(),
    }));
  }
  validateWithAggregate() {
    if (!this.title) {
      throw new Error('Need to specify a title for the Todo');
    }
    if (!this.description) {
      throw new Error('Need to specify a description for the Todo');
    }
  }
  validateAuthWithAggregate() {
    if (this.issuerAuth.getType() !== 'user') {
      throw new Error(`Only users can execute this command. Provided auth for an entity of type ${this.issuerAuth.getType()}`);
    }
  }
}

export class MarkTodoDoneCommand extends AggregateCommand {
  doExecuteWithAggregate(executionContext) {
    executionContext.commitEvent(new TodoMarkedDoneEvent({
      aggregateId: this.getAggregateId(),
      issuerCommandId: this.getCommandId(),
    }));
  }
  validateAuthWithAggregate(executionContext, aggregate) {
    const roles = this.getRolesForAggregate(aggregate);
    if (roles.indexOf('creator') < 0) {
      throw new Error('Only the creator of the Todo can mark it as done');
    }
  }
  // tslint:disable-next-line:prefer-function-over-method
  validateWithAggregate(executionContext, aggregate) {
    if (aggregate.status !== 'NotDone') {
      throw new Error('Aggregate is not currently in NotDone');
    }
  }
}

Command.registerCommandClass(CreateTodoCommand);
Command.registerCommandClass(MarkTodoDoneCommand);
