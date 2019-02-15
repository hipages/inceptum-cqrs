import { suite, test, slow, timeout } from 'mocha-typescript';
import { must } from 'must';
import * as sinon from 'sinon';
import { v1 } from 'uuid';
import { ExtendedError } from 'inceptum';
import { Aggregate } from '../../src/cqrs/Aggregate';
import { TodoCreatedEventExecutor, TodoCreatedEvent, TodoAggregate } from './TodoExample';

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
    test('checkEventCanBeApplied allows event with no ordinal on aggregate', () => {
      const aggregateType = 'voucher';
      const aggregateId = '1-aggregate-u-u-i-d';
      const one = new TodoAggregate(aggregateType, aggregateId);

      const eventId = 'test-event-1';
      const newEventId = 'new-test-event-1';

      const createEventExecutor = new TodoCreatedEventExecutor();
      const todoCreatedEvent = new TodoCreatedEvent('title', 'test', 'description', v1());
      const newTodoCreatedEvent = new TodoCreatedEvent('new title', 'new test', 'new description', v1());
      const nonConsecutiveTodoCreatedEvent = new TodoCreatedEvent('new title', 'new test', 'new description', v1());

      // apply the first event ordinal.
      one.checkEventCanBeApplied(todoCreatedEvent, todoCreatedEvent.ordinal, todoCreatedEvent.eventId);
      one.getMaxEventOrdinal().must.be.equal(0);
    });
    test('checkEventCanBeApplied throws error on a repeated ordinal', () => {
      const aggregateType = 'voucher';
      const aggregateId = '1-aggregate-u-u-i-d';
      const one = new TodoAggregate(aggregateType, aggregateId);

      const eventId = 'test-event-1';
      const newEventId = 'new-test-event-1';

      const createEventExecutor = new TodoCreatedEventExecutor();
      const todoCreatedEvent = new TodoCreatedEvent('title', 'test', 'description', v1());
      const newTodoCreatedEvent = new TodoCreatedEvent('new title', 'new test', 'new description', v1());
      const nonConsecutiveTodoCreatedEvent = new TodoCreatedEvent('new title', 'new test', 'new description', v1());

      createEventExecutor.apply(todoCreatedEvent, one);
      one.getNextEventOrdinal().must.be.equal(1);

      // apply same event, max event ordinal should not changed.
      try {
        one.checkEventCanBeApplied(todoCreatedEvent, 1, todoCreatedEvent.eventId);
        true.must.be.false();
      } catch (err) {
        err.must.be.an.error();
      }
    });

    test('checkEventCanBeApplied throws error on a skipped ordinal', () => {
      const aggregateType = 'voucher';
      const aggregateId = '1-aggregate-u-u-i-d';
      const one = new TodoAggregate(aggregateType, aggregateId);

      const eventId = 'test-event-1';
      const newEventId = 'new-test-event-1';

      const createEventExecutor = new TodoCreatedEventExecutor();
      const todoCreatedEvent = new TodoCreatedEvent('title', 'test', 'description', v1());
      const newTodoCreatedEvent = new TodoCreatedEvent('new title', 'new test', 'new description', v1());
      const nonConsecutiveTodoCreatedEvent = new TodoCreatedEvent('new title', 'new test', 'new description', v1());

      createEventExecutor.apply(todoCreatedEvent, one);
      one.getNextEventOrdinal().must.be.equal(1);

      // apply same event, max event ordinal should not changed.
      try {
        one.checkEventCanBeApplied(todoCreatedEvent, 3, todoCreatedEvent.eventId);
        true.must.be.false();
      } catch (err) {
        err.must.be.an.error();
      }
    });

    test.only('checkEventCanBeApplied is used for optimistic locking', () => {
      const aggregateType = 'voucher';
      const aggregateId = '1-aggregate-u-u-i-d';
      const one = new TodoAggregate(aggregateType, aggregateId);
      one.setUseOptimisticLocking(false);
      const spyiedCheckEventApplied = sinon.spy(one, 'checkEventCanBeApplied');

      const createEventExecutor = new TodoCreatedEventExecutor();
      const todoCreatedEvent = new TodoCreatedEvent('title', 'test', 'description', v1());
      const eeSpy =  sinon.spy(createEventExecutor, 'getEventOrdinal');

      Aggregate.applyEventOnAggregate(todoCreatedEvent, createEventExecutor, one);
      spyiedCheckEventApplied.called.must.be.false();

      one.setUseOptimisticLocking(true);
      Aggregate.applyEventOnAggregate(todoCreatedEvent, createEventExecutor, one);
      spyiedCheckEventApplied.called.must.be.true();
      eeSpy.called.must.be.true();
    });
  });
});
