export class ReturnToCallerError extends Error {
  httpStatusCode: number;
  cause?: Error;

  constructor(message: string, httpStatusCode = 500) {
    super(message);
    this.httpStatusCode = httpStatusCode;
    this.name = 'ReturnToCallerError';
  }

  getInfoToReturn() {
    return { message: this.message };
  }
}
