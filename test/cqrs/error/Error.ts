import { suite, test, slow, timeout } from 'mocha-typescript';
import { must } from 'must';
import { AuthorizationError } from '../../../src/cqrs/error/AuthorizationError';
import { ValidationError } from '../../../src/cqrs/error/ValidationError';
import { ReturnToCallerError } from '../../../src/cqrs/error/ReturnToCallerError';


suite('cqrs/Error', () => {
  test('AuthorizationError object has all properties', async () => {
    const expectedErrorMessage = 'Custom error message';
    const expectedHttpStatusCode = 403;
    const expectedName = 'AuthorizationError';
    const authorizationError = new AuthorizationError(expectedErrorMessage);
    authorizationError.httpStatusCode.must.equal(expectedHttpStatusCode);
    authorizationError.name.must.equal(expectedName);
    authorizationError.message.must.equal(expectedErrorMessage);
  });
  test('ReturnToCallerError object has all properties', async () => {
    const expectedErrorMessage = 'Custom error message';
    const expectedHttpStatusCode = 500;
    const expectedName = 'ReturnToCallerError';
    const returnToCallerError = new ReturnToCallerError(expectedErrorMessage);
    returnToCallerError.httpStatusCode.must.equal(expectedHttpStatusCode);
    returnToCallerError.name.must.equal(expectedName);
    returnToCallerError.message.must.equal(expectedErrorMessage);
  });
  test('ValidationError object has all properties', async () => {
    const expectedErrorMessage = 'Custom error message';
    const expectedHttpStatusCode = 400;
    const expectedName = 'ValidationError';
    const validationError = new ValidationError(expectedErrorMessage);
    validationError.httpStatusCode.must.equal(expectedHttpStatusCode);
    validationError.name.must.equal(expectedName);
    validationError.message.must.equal(expectedErrorMessage);
  });
});
