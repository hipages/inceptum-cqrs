import { suite, test } from 'mocha-typescript';
import { must } from 'must';
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
}
