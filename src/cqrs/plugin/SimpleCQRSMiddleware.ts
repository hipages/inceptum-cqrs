import { LogManager } from 'inceptum';
import { Request } from 'express';
import * as stringify from 'json-stringify-safe';
import { CQRS } from '../CQRS';
import { Command } from '../command/Command';
import { ReturnToCallerError } from '../error/ReturnToCallerError';
import { AbstractCQRSMiddleware } from './AbstractCQRSMiddleware';

const logger = LogManager.getLogger(__filename);

/**
 * A simpler CQRS middleware that registers a set of paths:
 * - GET `/<aggregateName>/<aggregateId>`: Gets an aggregate by Id
 * - POST `/<aggregateName>`: Executes a command called: `Create<AggregateName>` with the body of the request as the payload
 * - POST `/<aggregateName>/<aggregateId>/<commandName>`: Executes a command called `commandName` or alternatively `<CommandName><AggregateName>`, with the body of the request as the payload (the aggregateId will be injected in the payload)
 * - DELETE `/<aggregateName>/<aggregateId>`: Executes a command called: `Delete<AggregateName>` with the body of the request as the payload (the aggregateId will be injected in the payload)
 */
export class SimpleCQRSMiddleware extends AbstractCQRSMiddleware {
  handlerCache: Map<any, any>;

  /**
   *
   * @param {CQRS} cqrs
   */
  constructor() {
    super();
    this.handlerCache = new Map();
  }

  register(expressApp) {
    const self = this;
    logger.debug('Registering CQRS Simple middleware');

    // Register Gets
    this.cqrs.getRegisteredAggregates().forEach((aggregateName) => {
      logger.debug(`Registering GET /${aggregateName}/:aggregateId`);
      expressApp.get(`/${aggregateName}/:aggregateId`, (req, res) => {
        this.handleCQRSGetWithName(req, res, aggregateName, req.params.aggregateId);
      });
    });

    // Register Create commands
    this.cqrs.getRegisteredAggregates().forEach((aggregateName) => {
      
      logger.debug(`Registering GET /${aggregateName}/:aggregateId`);
      expressApp.get(`/${aggregateName}/:aggregateId`, (req, res) => {
        this.handleCQRSGetWithName(req, res, aggregateName, req.params.aggregateId);
      });
    });


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
