import { LogManager, NewrelicUtil } from 'inceptum';
import { Request } from 'express';
import * as stringify from 'json-stringify-safe';
import { CQRS } from '../CQRS';
import { Command } from '../command/Command';
import { ReturnToCallerError } from '../error/ReturnToCallerError';

const logger = LogManager.getLogger(__filename);

const SWAGGER_CQRS_COMMAND_PROPERTY = 'x-inceptum-cqrs-command';
const SWAGGER_CQRS_GET_PROPERTY = 'x-inceptum-cqrs-get';

const newrelic = NewrelicUtil.getNewrelicIfAvailable();

export class SwaggerCQRSMiddleware {
  handlerCache: Map<any, any>;
  cqrs: CQRS;

  /**
   *
   * @param {CQRS} cqrs
   */
  constructor() {
    this.handlerCache = new Map();
  }

  setCQRS(cqrs: CQRS) {
    this.cqrs = cqrs;
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
  // tslint:disable-next-line:prefer-function-over-method
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

  // tslint:disable-next-line:prefer-function-over-method
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
      return await this.handleCQRSCommandWithName(req, res, parts[0], parts[1]);
    }
    return await this.handleCQRSCommandWithName(req, res, cqrsCommand, 'body');
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
      return await this.handleCQRSGetWithName(req, res, parts[0], parts[1]);
    }
    return await this.handleCQRSGetWithName(req, res, cqrsGet, 'id');
  }

  /**
   * @private
   * @param req
   * @param res
   * @param commandName
   * @param paramName
   * @returns {*}
   */
  async handleCQRSGetWithName(req, res, aggregateName, paramName) {
    if (newrelic && req.swagger && req.swagger.apiPath) {
      // NR adds a `/` at the start of the path for us.
      const basePath = req.swagger.swaggerObject.basePath.substring(1);
      newrelic.setTransactionName(`${basePath}${req.swagger.apiPath}`);
      newrelic.recordMetric(`Custom/CQRSGet/${aggregateName}`);
    }
    const id = this.getPayload(req, paramName);
    const aggregate = await this.cqrs.getAggregate(id);
    if (!aggregate) {
      res.status(404);
      res.send(`Couldn't find aggregate id ${id}`);
    } else {
      res.send(aggregate);
    }
  }

  /**
   * @private
   * @param req
   * @param res
   * @param commandName
   * @param bodyParamName
   * @returns {*}
   */
  async handleCQRSCommandWithName(req, res, commandName, bodyParamName) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    if (newrelic && req.swagger && req.swagger.apiPath) {
      // NR adds a `/` at the start of the path for us.
      const basePath = req.swagger.swaggerObject.basePath.substring(1);
      newrelic.setTransactionName(`${basePath}${req.swagger.apiPath}`);
      newrelic.recordMetric(`Custom/CQRSCommand/${commandName}`);
    }
    const payload = this.getPayload(req, bodyParamName);
    const command = this.cqrs.deserialiseCommand(payload || {}, commandName);
    try {
      const executionContext = await this.cqrs.executeCommand(command);

      if (executionContext.hasCommandResultForCommand(command)) {
        const commandResult = executionContext.getCommandResultForCommand(command);
        if (commandResult.hasNewAggregateId()) {
          res.header('Location', commandResult.getNewAggregateId());
          res.status(201);
        } else {
          res.status(200);
        }
        res.send(commandResult);
      } else {
        res.status(204);
        res.send('');
      }
    } catch (err) {
      logger.error(err, `Exception executing command ${commandName}: ${stringify(command)}`);
      if (newrelic) {
        newrelic.noticeError(err);
      }
      if (err instanceof ReturnToCallerError) {
        res.status(err.httpStatusCode);
        res.send(err.getInfoToReturn());
      } else {
        const internalError = 'Internal Server Error';
        res.status(500);
        res.send({ message: internalError});
      }
    }
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
