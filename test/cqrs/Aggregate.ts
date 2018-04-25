import { suite, test, slow, timeout } from 'mocha-typescript';
import { must } from 'must';
import { v1 } from 'uuid';
import { ExtendedError } from 'inceptum';
import { Aggregate } from '../../src/cqrs/Aggregate';
import { TodoCreatedEventExecutor, TodoCreatedEvent } from './TodoExample';

suite('cqrs/Aggregate', () => {
  suite('Aggregate roles', () => {
    test('Aggregate roles for unknown entities is empty', () => {
      const aggregate = new Aggregate('test', '1234');
      const preRoles = aggregate.getAggregateRolesFor('entity:123');
      preRoles.length.must.equal(0);
    });
    test('Adding roles work', () => {
      const aggregate = new Aggregate('test', '1234');
      const preRoles = aggregate.getAggregateRolesFor('entity:123');
      preRoles.length.must.equal(0);
      aggregate.addAggregateRole('entity:123', ['role1']);
      const postRoles = aggregate.getAggregateRolesFor('entity:123');
      postRoles.length.must.equal(1);
      postRoles.must.eql(['role1']);
    });
    test('Removing a specific role works', () => {
      const aggregate = new Aggregate('test', '1234');
      aggregate.addAggregateRole('entity:123', ['role1', 'role2']);
      const preRoles = aggregate.getAggregateRolesFor('entity:123');
      preRoles.length.must.equal(2);
      preRoles.must.eql(['role1', 'role2']);
      aggregate.removeAggregateRole('entity:123', ['role1']);
      const postRoles = aggregate.getAggregateRolesFor('entity:123');
      postRoles.length.must.equal(1);
      postRoles.must.eql(['role2']);
    });
    test('Removing all entity roles work', () => {
      const aggregate = new Aggregate('test', '1234');
      aggregate.addAggregateRole('entity:123', ['role1', 'role2']);
      const preRoles = aggregate.getAggregateRolesFor('entity:123');
      preRoles.length.must.equal(2);
      preRoles.must.eql(['role1', 'role2']);
      aggregate.removeAggregateRole('entity:123');
      const postRoles = aggregate.getAggregateRolesFor('entity:123');
      postRoles.length.must.equal(0);
    });
  });

  suite('Aggregate event ordinal', () => {
    test('aggregate max ordinal prevent applying duplicate and non consecutive events.', () => {
      const aggregateType = 'voucher';
      const aggregateId = '1-aggregate-u-u-i-d';
      const one = new Aggregate(aggregateType, aggregateId);

      const eventId = 'test-event-1';
      const newEventId = 'new-test-event-1';

      const createEventExecutor = new TodoCreatedEventExecutor();
      const todoCreatedEvent = new TodoCreatedEvent('title', 'test', 'description', v1());
      const newTodoCreatedEvent = new TodoCreatedEvent('new title', 'new test', 'new description', v1());
      const nonConsecutiveTodoCreatedEvent = new TodoCreatedEvent('new title', 'new test', 'new description', v1());

      // apply the first event ordinal.
      one.applyEventOrdinal(createEventExecutor, todoCreatedEvent).must.be.instanceof(Aggregate);
      one.getMaxEventOrdinal().must.be.equal(1);
      one.getNextEventOrdinal().must.be.equal(2);

      createEventExecutor.getEventOrdinal(todoCreatedEvent).must.be.equal(1);

      // apply same event, max event ordinal should not changed.
      try {
        one.applyEventOrdinal(createEventExecutor, todoCreatedEvent);
      } catch (err) {
        err.must.be.instanceof(Error);
      }

      one.getMaxEventOrdinal().must.be.equal(1);
      one.getNextEventOrdinal().must.be.equal(2);

      one.applyEventOrdinal(createEventExecutor, newTodoCreatedEvent);
      createEventExecutor.getEventOrdinal(newTodoCreatedEvent).must.be.equal(2);
      one.getMaxEventOrdinal().must.be.equal(2);
      one.getNextEventOrdinal().must.be.equal(3);

      createEventExecutor.setEventOrdinal(nonConsecutiveTodoCreatedEvent, 99);
      try {
        one.applyEventOrdinal(createEventExecutor, nonConsecutiveTodoCreatedEvent);
      } catch (err) {
        err.must.be.instanceof(Error);
        err.message.must.include('Appying non consecutive event');
      }
      one.getMaxEventOrdinal().must.be.equal(2);
      one.getNextEventOrdinal().must.be.equal(3);
    });

    test('test eventApplied', () => {
      const aggregateType = 'voucher';
      const aggregateId = '1-aggregate-u-u-i-d';
      const one = new Aggregate(aggregateType, aggregateId);

      const eventId = 'test-event-1';
      const newEventId = 'new-test-event-1';

      const createEventExecutor = new TodoCreatedEventExecutor();
      const todoCreatedEvent = new TodoCreatedEvent('title', 'test', 'description', v1());
      const newTodoCreatedEvent = new TodoCreatedEvent('new title', 'new test', 'new description', v1());

      one.applyEventOrdinal(createEventExecutor, todoCreatedEvent);
      one.eventApplied(createEventExecutor, newTodoCreatedEvent).must.be.false();
    });
  });
});
