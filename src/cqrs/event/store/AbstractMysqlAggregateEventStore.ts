import { MySQLClient, Autowire, LogManager, DBTransaction, ExtendedError } from 'inceptum';
import * as moment from 'moment';
import { LockViolationError } from '../../error/LockViolationError';
import { AggregateEventStore } from './AggregateEventStore';

export const mySQLDateTimeFormat = 'YYYY-MM-DD HH:mm:ss';
export const mySQLDateFormat = 'YYYY-MM-DD';
const logger = LogManager.getLogger(__filename);

interface MysqlAggregateEventData {
  event_id: string,
  aggregate_id: string,
  eventCreatedTime: string,
  eventCommittedTime: string,
  eventType: string,
  eventContent: string,
  ordinal: number,
}

export abstract class AbstractMysqlAggregateEventStore extends AggregateEventStore {
  @Autowire('AggregateMySQLClient')
  private mysqlClient: MySQLClient;

  async getEventsOf(aggregateId: string): Promise<any[]> {
    const sql = `SELECT *
                    FROM aggregate_events
                    WHERE aggregate_id = ?
                    ORDER BY ordinal, event_committed_time ASC`;
    const rows = await this.mysqlClient.read<MysqlAggregateEventData>(sql, aggregateId);
    return rows.map((row) => {
      return this.dataToAggregateEvent(row['event_content']);
    });
  }

  async commitEvent(aggregateEvent: any): Promise<void> {
    const data = this.aggregateEventToData(aggregateEvent);
    const sql = `INSERT INTO aggregate_events (
      event_id,
      aggregate_id,
      event_created_time,
      event_committed_time,
      event_type,
      event_content,
      ordinal)
    VALUES ?`;
    try {
console.log('commit event');
      await this.mysqlClient.executeSql(false, sql, [data]);
    } catch (e) {
      if (this.isLockViolation(e)) {
        // throw locking violation
        this.throwLockViolation(e);
      }
      throw e;
    }
  }

  async commitAllEvents(aggregateEvents: any[]): Promise<void> {
    const data = aggregateEvents.map(this.aggregateEventToData);
    const sql = `INSERT INTO aggregate_events (
      event_id,
      aggregate_id,
      event_created_time,
      event_committed_time,
      event_type,
      event_content,
      ordinal)
    VALUES ?`;
    try {
      await this.mysqlClient.executeSql(false, sql, data);
    } catch (e) {
      if (this.isLockViolation(e)) {
        // throw locking violation
        this.throwLockViolation(e);
      }
      throw e;
    }
  }

  // tslint:disable-next-line:prefer-array-literal
  protected abstract aggregateEventToData(aggregateEvent: any): Array<any>;
  protected abstract dataToAggregateEvent(eventData: string): Array<any>;

  protected isLockViolation(e: Error): boolean {
    return /^(ER_DUP_ENTRY).*(ordinal)/.test(e.message);
  }

  protected throwLockViolation(cause: Error) {
    throw new LockViolationError('State has been changed since the resource was first accessed by the transaction.', cause);
  }
}
