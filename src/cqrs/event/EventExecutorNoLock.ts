import {Aggregate} from '../Aggregate';
import { EventExecutor } from './EventExecutor';

/**
 * No Lock EventExcecutor does not consider event ordinal.
 */
export abstract class EventExecutorNoLock<E, A extends Aggregate> extends EventExecutor<E, A> {
  abstract canExecute(event: any): boolean;
  abstract apply(event: E, aggregate: A);
  abstract getEventId(event: E): string;
  /**
   * Expect event has no ordinal property. Do nothing.
   * @param event
   * @param ordinal
   */
  protected setEventOrdinal(event: E, ordinal: number) {
    // bypass tslint
  }
  /**
   * Expect the event does not have ordinal.
   * Return 1 to bypass updateEventOrdinal logic in this class.
   * @param event
   * @returns number
   */
  getEventOrdinal(event: E): number {
    return 1;
  }

  /**
   * Expect the event does not have ordinal.
   * Do nothing.
   * @param event
   * @param aggregate
   */
  updateEventOrdinal(event: E, ordinal: number) {
    // bypass tslint
  }

}
