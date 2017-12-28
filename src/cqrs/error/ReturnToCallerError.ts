import {ExtendedError} from 'inceptum';
export class ReturnToCallerError extends ExtendedError {
  httpStatusCode: number;

  constructor(message: string, httpStatusCode = 500, cause?: Error) {
    super(message, cause);
    this.httpStatusCode = httpStatusCode;
    this.name = 'ReturnToCallerError';
  }

  /**
   * Do not override this method. This is the method you should call to know what to return to the caller
   */
  getAllInfoToReturn() {
    if (this.cause) {
      const toReturn = this.getInfoToReturn();
      if (this.cause instanceof ReturnToCallerError) {
        toReturn['cause'] = this.cause.getAllInfoToReturn();
      } else {
        toReturn['cause'] = { message: this.cause.message };
      }
      return toReturn;
    }
    return this.getInfoToReturn();
  }

  /**
   * Please override this method to return whatever information you want to give back to the caller
   */
  getInfoToReturn() {
    return { message: this.message };
  }
}
