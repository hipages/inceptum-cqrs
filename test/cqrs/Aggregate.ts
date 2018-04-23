import { suite, test, slow, timeout } from 'mocha-typescript';
import { must } from 'must';
import { Aggregate } from '../../src/cqrs/Aggregate';

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

  suite('Aggregate event counter', () => {
    test('aggregate events counter prevent applying duplicate event ids.', () => {
      const aggregateType = 'voucher';
      const aggregateId = '1-aggregate-u-u-i-d';
      const one = new Aggregate(aggregateType, aggregateId);

      const eventId = 'test-event-1';
      const newEventId = 'new-test-event-1';

      one.applyEvent(eventId).must.be.instanceof(Aggregate);
      one.getNextEventOrdinal().must.be.equal(2);

      one.eventApplied(eventId).must.be.true();
      one.eventApplied(newEventId).must.be.false();

      // apply same event id, event counter should not changed.
      one.applyEvent(eventId);
      one.getNextEventOrdinal().must.be.equal(2);

      one.applyEvent(newEventId);
      one.getNextEventOrdinal().must.be.equal(3);
    });
  });
});
