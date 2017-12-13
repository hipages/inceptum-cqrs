import { ReturnToCallerError } from './ReturnToCallerError';

export class AuthorizationError extends ReturnToCallerError {

  constructor(message: string, httpStatusCode = 403) {
    super(message, httpStatusCode);
    this.name = 'AuthorizationError';
  }
}
