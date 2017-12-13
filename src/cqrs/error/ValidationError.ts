import { ReturnToCallerError } from './ReturnToCallerError';

export class ValidationError extends ReturnToCallerError {

  constructor(message: string, httpStatusCode = 400) {
    super(message, httpStatusCode);
    this.name = 'ValidationError';
  }
}
