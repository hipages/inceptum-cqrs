import { LogManager, NewrelicUtil } from 'inceptum';
import { Request } from 'express';
import * as stringify from 'json-stringify-safe';
import { CQRS } from '../CQRS';
import { Command } from '../command/Command';
import { ReturnToCallerError } from '../error/ReturnToCallerError';

const logger = LogManager.getLogger(__filename);


const newrelic = NewrelicUtil.getNewrelicIfAvailable();

export abstract class AbstractCQRSMiddleware {
  cqrs: CQRS;

  setCQRS(cqrs: CQRS) {
    this.cqrs = cqrs;
  }

  abstract register(expressApp);

  /**
   * Executes a get for a specific aggregate
   * @param req
   * @param res
   * @param aggregateName
   * @param aggregateId
   * @returns {*}
   */
  async handleCQRSGetWithName(req, res, aggregateName, aggregateId) {
    if (newrelic && req.swagger && req.swagger.apiPath) {
      // NR adds a `/` at the start of the path for us.
      const basePath = req.swagger.swaggerObject.basePath.substring(1);
      newrelic.setTransactionName(`${basePath}${req.swagger.apiPath}`);
      newrelic.recordMetric(`Custom/CQRSGet/${aggregateName}`);
    }
    const aggregate = await this.cqrs.getAggregate(aggregateId);
    if (!aggregate) {
      res.status(404);
      res.send(`Couldn't find aggregate id ${aggregateId}`);
    } else if (aggregateName !== aggregate.aggregateType) {
      res.status(400);
      res.send(`aggregate with id ${aggregateId} is not of type ${aggregateName}`);
    } else {
      res.send(aggregate);
    }
  }

  /**
   * Executes a command given a name and a payload (the request body)
   * @param req
   * @param res
   * @param commandName
   * @param payload
   * @returns {*}
   */
  async handleCQRSCommandWithName(req, res, commandName, payload) {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    if (newrelic && req.swagger && req.swagger.apiPath) {
      // NR adds a `/` at the start of the path for us.
      const basePath = req.swagger.swaggerObject.basePath.substring(1);
      newrelic.setTransactionName(`${basePath}${req.swagger.apiPath}`);
      newrelic.recordMetric(`Custom/CQRSCommand/${commandName}`);
    }
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
      logger.error(`Exception executing command ${commandName}: ${stringify(command)}`, err);
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
}
