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
});
