import {ExtendedError} from 'inceptum';
export class ReturnToCallerError extends ExtendedError {
  httpStatusCode: number;

  constructor(message: string, httpStatusCode = 500, cause?: Error) {
    super(message, cause);
    this.httpStatusCode = httpStatusCode;
    this.name = 'ReturnToCallerError';
  }

  getAllInfo() {
    if (this.cause) {
      const toReturn = this.getInfoToReturn();
      if (this.cause instanceof ReturnToCallerError) {
        toReturn['cause'] = this.cause.getInfoToReturn();
      } else {
        toReturn['cause'] = { message: this.cause.message };
      }
      return toReturn;
    }
    return this.getInfoToReturn();
  }

  getInfoToReturn() {
    return { message: this.message };
  }
}
