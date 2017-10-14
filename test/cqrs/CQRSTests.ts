import { suite, test, slow, timeout } from 'mocha-typescript';
import { must } from 'must';
import * as UUID from 'uuid';

import { CQRS } from '../../src/cqrs/CQRS';
import { Auth } from '../../src/auth/Auth';
import { InMemoryAggregateEventStore } from '../../src/cqrs/event/store/InMemoryAggregateEventStore';
import { CreateTodoCommand, TodoAggregate } from './TodoExample';

const cqrs = new CQRS(new InMemoryAggregateEventStore());
cqrs.registerAggregateClass('Todo', TodoAggregate);
const issuerAuth = new Auth('user', 'userId1', ['registered']);

suite('cqrs', () => {
  suite('Can execute command', () => {
    test('Creates a Todo when the command is executed', () => {
      const aggregateId = UUID.v4();
      cqrs.executeCommand(CQRS.deserialiseCommand({ aggregateId, issuerAuth, title: 'Test title', description: 'Test description' },
        'CreateTodoCommand'));
      const aggregate: TodoAggregate = cqrs.getAggregate(aggregateId) as TodoAggregate;
      aggregate.must.be.an.instanceOf(TodoAggregate);
      aggregate.title.must.equal('Test title');
      aggregate.description.must.equal('Test description');
      aggregate.status.must.equal('NotDone');
    });
    test('Validates the command on execution', () => {
      const aggregateId = UUID.v4();
      try {
        cqrs.executeCommand(CQRS.deserialiseCommand({ aggregateId, issuerAuth, title: 'Test title' }, 'CreateTodoCommand'));
        true.must.be.falsy();
      } catch (e) {
        e.must.be.an.error(/^There was an error executing command/);
        e.cause.must.be.an.error('Need to specify a description for the Todo');
      }
    });
    test('Can be marked as done', () => {
      const aggregateId = UUID.v4();
      const executionContext = cqrs.newExecutionContext();
      executionContext.addCommandToExecute(CQRS.deserialiseCommand<CreateTodoCommand>({
        aggregateId,
        issuerAuth,
        title: 'Test title',
        description: 'Test description' }, 'CreateTodoCommand'));
      executionContext.addCommandToExecute(CQRS.deserialiseCommand({ aggregateId, issuerAuth }, 'MarkTodoDoneCommand'));
      executionContext.commit();
      const aggregate = cqrs.getAggregate(aggregateId) as TodoAggregate;
      aggregate.title.must.equal('Test title');
      aggregate.description.must.equal('Test description');
      aggregate.status.must.equal('Done');
    });
    test('Aggregates survive execution contexts', () => {
      const aggregateId = UUID.v4();
      const executionContext = cqrs.newExecutionContext();
      executionContext.addCommandToExecute(CQRS.deserialiseCommand({
        aggregateId,
        title: 'Test title',
        issuerAuth,
        description: 'Test description',
      }, 'CreateTodoCommand'));
      executionContext.commit();
      const aggregate = cqrs.getAggregate(aggregateId) as TodoAggregate;
      aggregate.title.must.equal('Test title');
      aggregate.description.must.equal('Test description');
      aggregate.status.must.equal('NotDone');
      const executionContext2 = cqrs.newExecutionContext();
      executionContext2.addCommandToExecute(CQRS.deserialiseCommand({ aggregateId, issuerAuth }, 'MarkTodoDoneCommand'));
      executionContext2.commit();
      const aggregate2 = cqrs.getAggregate(aggregateId) as TodoAggregate;
      aggregate2.title.must.equal('Test title');
      aggregate2.description.must.equal('Test description');
      aggregate2.status.must.equal('Done');
    });
    test('Only the creator can mark the TODO as done', () => {
      const aggregateId = UUID.v4();
      const executionContext = cqrs.newExecutionContext();
      executionContext.addCommandToExecute(CQRS.deserialiseCommand({
        aggregateId,
        title: 'Test title',
        issuerAuth,
        description: 'Test description',
      }, 'CreateTodoCommand'));
      executionContext.commit();

      const issuerAuth2 = new Auth('user', 'other', ['registered']);

      const executionContext2 = cqrs.newExecutionContext();
      executionContext2.addCommandToExecute(CQRS.deserialiseCommand({ aggregateId, issuerAuth: issuerAuth2 }, 'MarkTodoDoneCommand'));
      try {
        executionContext2.commit();
        true.must.be.falsy();
      } catch (e) {
        e.must.be.an.error(/^There was an error executing command/);
        e.cause.must.be.an.error('Only the creator of the Todo can mark it as done');
      }
    });
  });
});
