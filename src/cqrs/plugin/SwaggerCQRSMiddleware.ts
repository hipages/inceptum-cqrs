import { LogManager } from 'inceptum';
import { Request } from 'express';
import * as stringify from 'json-stringify-safe';
import { CQRS } from '../CQRS';
import { Command } from '../command/Command';
import { ReturnToCallerError } from '../error/ReturnToCallerError';
import { AbstractCQRSMiddleware } from './AbstractCQRSMiddleware';

const logger = LogManager.getLogger(__filename);

const SWAGGER_CQRS_COMMAND_PROPERTY = 'x-inceptum-cqrs-command';
const SWAGGER_CQRS_GET_PROPERTY = 'x-inceptum-cqrs-get';

export class SwaggerCQRSMiddleware extends AbstractCQRSMiddleware {
  handlerCache: Map<any, any>;

  /**
   *
   * @param {CQRS} cqrs
   */
  constructor() {
    super();
    this.handlerCache = new Map();
  }

  /**
   * @private
   * @param req
   * @returns {boolean}
   */
  hasCQRSCommand(req) {
    return !!this.getCQRSCommand(req);
  }

  hasCQRSGet(req) {
    return !!this.getCQRSGet(req);
  }

  /**
   * @private
   * @param req
   * @returns {*}
   */
  getCQRSCommand(req) {
    if (!req || !req.swagger) {
      return undefined;
    }
    if (req.swagger.operation && req.swagger.operation[SWAGGER_CQRS_COMMAND_PROPERTY]) {
      return req.swagger.operation[SWAGGER_CQRS_COMMAND_PROPERTY];
    }
    if (req.swagger.path && req.swagger.path[SWAGGER_CQRS_COMMAND_PROPERTY]) {
      return req.swagger.path[SWAGGER_CQRS_COMMAND_PROPERTY];
    }
    return undefined;
  }

  getCQRSGet(req) {
    if (!req || !req.swagger) {
      return undefined;
    }
    if (req.swagger.operation && req.swagger.operation[SWAGGER_CQRS_GET_PROPERTY]) {
      return req.swagger.operation[SWAGGER_CQRS_GET_PROPERTY];
    }
    if (req.swagger.path && req.swagger.path[SWAGGER_CQRS_GET_PROPERTY]) {
      return req.swagger.path[SWAGGER_CQRS_GET_PROPERTY];
    }
    return undefined;
  }

  register(expressApp) {
    const self = this;
    logger.debug('Registering CQRS Swagger middleware');
    expressApp.use(async (req, res, next) => {
      try {
        if (self.hasCQRSCommand(req)) {
          // There's a controller to be called.
          await self.handleCQRSCommand(req, res);
        } else if (self.hasCQRSGet(req)) {
          await self.handleCQRSGet(req, res);
        } else {
          // No cqrs command defined, let it pass
          next();
        }
      } catch (e) {
        next(e);
      }
    });
  }

  /**
   * @private
   * @param req
   * @returns {Request}
   */
  async handleCQRSCommand(req, res) {
    const cqrsCommand = this.getCQRSCommand(req);
    if (cqrsCommand.indexOf(':') > 0) {
      const parts = cqrsCommand.split(':', 2);
      return await this.handleCQRSCommandWithParamName(req, res, parts[0], parts[1]);
    }
    return await this.handleCQRSCommandWithParamName(req, res, cqrsCommand, 'body');
  }


  /**
   * @private
   * @param req
   * @returns {Request}
   */
  async handleCQRSGet(req, res) {
    const cqrsGet = this.getCQRSGet(req);
    if (cqrsGet.indexOf(':') > 0) {
      const parts = cqrsGet.split(':', 2);
      return await this.handleCQRSGetWithParamName(req, res, parts[0], parts[1]);
    }
    return await this.handleCQRSGetWithParamName(req, res, cqrsGet, 'id');
  }

  async handleCQRSGetWithParamName(req, res, aggregateName, paramName) {
    return this.handleCQRSGetWithName(req, res, aggregateName, this.getPayload(req, paramName));
  }

  /**
   * @private
   * @param req
   * @param res
   * @param commandName
   * @param bodyParamName
   * @returns {*}
   */
  async handleCQRSCommandWithParamName(req, res, commandName, bodyParamName) {
    const payload = this.getPayload(req, bodyParamName);
    return this.handleCQRSCommandWithName(req, res, commandName, payload);
  }

  /**
   * @private
   * @param req
   * @param bodyParamName
   * @returns {*}
   */
  // tslint:disable-next-line:prefer-function-over-method
  getPayload(req, bodyParamName) {
    if (req.swagger.params && req.swagger.params[bodyParamName]) {
      return req.swagger.params[bodyParamName].value;
    }
    return undefined;
  }
}
