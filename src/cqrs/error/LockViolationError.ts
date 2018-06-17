import { ReturnToCallerError } from './ReturnToCallerError';

export class LockViolationError extends ReturnToCallerError {

  constructor(message: string, cause?: Error) {
    super(message, 500, cause);
    this.name = 'LockViolationError';
  }

}
