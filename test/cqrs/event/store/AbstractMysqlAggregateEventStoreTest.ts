import { suite, test } from 'mocha-typescript';
import { must } from 'must';
import * as sinon from 'sinon';
import { MySQLClient } from 'inceptum';
import { AbstractMysqlAggregateEventStore } from '../../../../src/cqrs/event/store/AbstractMysqlAggregateEventStore';
import { LockViolationError } from '../../../../src/cqrs/error/LockViolationError';

class AbstractMysqlAggregateEventStoreHelper extends AbstractMysqlAggregateEventStore {

  throwLockViolation(cause: Error) {
    super.throwLockViolation(cause);
  }

  isLockViolation(e: Error): boolean {
    return super.isLockViolation(e);
  }

  aggregateEventToData(event: any) {
    return [];
  }

  dataToAggregateEvent(eventData: string) {
    return [];
  }

  getEventsSql(): string {
    return super.getEventsSql();
  }

  setUseOptimisitcLocking(use: boolean) {
    this.useOptimisticLocking = use;
  }

  commitEventSql(): string {
    return super.commitEventSql();
  }

  setMysqlClient(c) {
    this.mysqlClient = c;
  }
}

@suite
class AbstractMysqlAggregateEventStoreTest {

  @test
  'duplicate ordinal error'() {
    const s = new AbstractMysqlAggregateEventStoreHelper();
    const dupError = new Error(`ER_DUP_ENTRY: Duplicate entry '1edd6341-7222-11e8-b373-db6d8154767c-2' for key 'aggregate_id_ordinal'`);
    s.isLockViolation(dupError).must.be.true();
  }

  @test
  'must throw LockViolation'() {
    const s = new AbstractMysqlAggregateEventStoreHelper();
    const dupError = new Error(`ER_DUP_ENTRY: Duplicate entry '1edd6341-7222-11e8-b373-db6d8154767c-2' for key 'aggregate_id_ordinal'`);
    try {
      s.throwLockViolation(dupError);
    } catch (e) {
      e.must.be.instanceof(LockViolationError);
      e.causingError.must.be.eql(dupError);
    }
  }

  @test
  'test getEventsSql'() {
    const s = new AbstractMysqlAggregateEventStoreHelper();

    const useLockingSql = `
      SELECT *
      FROM aggregate_events
      WHERE aggregate_id = ?
      ORDER BY ordinal,event_committed_time ASC;`;
    s.getEventsSql().trim().must.be.eql(useLockingSql.trim());

    s.setUseOptimisitcLocking(false);
    const noLockingSql = `
      SELECT *
      FROM aggregate_events
      WHERE aggregate_id = ?
      ORDER BY event_committed_time ASC;`;
    s.getEventsSql().trim().must.be.eql(noLockingSql.trim());
  }

  @test
  'test commitEventSql'() {
    const s = new AbstractMysqlAggregateEventStoreHelper();

    const useLockingSql = `
      INSERT INTO aggregate_events (
        event_id,
        aggregate_id,
        event_created_time,
        event_committed_time,
        event_type,
        event_content
        , ordinal)
      VALUES ? `;
    s.commitEventSql().trim().must.be.eql(useLockingSql.trim());

    s.setUseOptimisitcLocking(false);
    const noLockingSql = `
      INSERT INTO aggregate_events (
        event_id,
        aggregate_id,
        event_created_time,
        event_committed_time,
        event_type,
        event_content
        )
      VALUES ? `;
    s.commitEventSql().trim().must.be.eql(noLockingSql.trim());
  }

  @test
  async 'test commitAllEvents success'() {
    const mysqlClientStub = sinon.createStubInstance(MySQLClient, {
      executeSql: (a, b, c) => { /**/ },
    });
    const s = new AbstractMysqlAggregateEventStoreHelper();
    s.setMysqlClient(mysqlClientStub);
    const res = await s.commitAllEvents([]);

    // throwLockViolation
    const dupError = new Error(`ER_DUP_ENTRY: Duplicate entry '1edd6341-7222-11e8-b373-db6d8154767c-2' for key 'aggregate_id_ordinal'`);
    const mysqlClientFailedStub = sinon.createStubInstance(MySQLClient, {
      executeSql: sinon.stub().rejects(dupError),
    });
    const etest = new AbstractMysqlAggregateEventStoreHelper();
    etest.setMysqlClient(mysqlClientFailedStub);
    try {
      await etest.commitAllEvents([]);
    } catch (e) {
      e.must.be.instanceof(LockViolationError);
      e.causingError.must.be.eql(dupError);
    }

    // other error
    const error = new Error(`sql error`);
    const otherErrStub = sinon.createStubInstance(MySQLClient, {
      executeSql: sinon.stub().rejects(error),
    });
    const otherErrTest = new AbstractMysqlAggregateEventStoreHelper();
    otherErrTest.setMysqlClient(otherErrStub);
    try {
      await otherErrTest.commitAllEvents([]);
    } catch (e) {
      e.must.be.eql(error);
    }
  }

  @test
  async 'test commitEvents'() {
    const mysqlClientStub = sinon.createStubInstance(MySQLClient, {
      executeSql: (a, b, c) => { /**/ },
    });
    const s = new AbstractMysqlAggregateEventStoreHelper();
    s.setMysqlClient(mysqlClientStub);
    const res = await s.commitEvent([]);

    // throwLockViolation
    const dupError = new Error(`ER_DUP_ENTRY: Duplicate entry '1edd6341-7222-11e8-b373-db6d8154767c-2' for key 'aggregate_id_ordinal'`);
    const mysqlClientFailedStub = sinon.createStubInstance(MySQLClient, {
      executeSql: sinon.stub().rejects(dupError),
    });
    const etest = new AbstractMysqlAggregateEventStoreHelper();
    etest.setMysqlClient(mysqlClientFailedStub);
    try {
      await etest.commitEvent([]);
    } catch (e) {
      e.must.be.instanceof(LockViolationError);
      e.causingError.must.be.eql(dupError);
    }

    // other error
    const error = new Error(`sql error`);
    const otherErrStub = sinon.createStubInstance(MySQLClient, {
      executeSql: sinon.stub().rejects(error),
    });
    const otherErrTest = new AbstractMysqlAggregateEventStoreHelper();
    otherErrTest.setMysqlClient(otherErrStub);
    try {
      await otherErrTest.commitEvent([]);
    } catch (e) {
      e.must.be.eql(error);
    }
  }
}
