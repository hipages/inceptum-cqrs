import { LogManager } from 'inceptum';
import { Request } from 'express';
import * as bodyParser from 'body-parser';
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
 * - POST `/submit/<commandName>`: Executes a command called `commandName` with the body of the request as the payload (the aggregateId will be injected in the payload)
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
      expressApp.get(`/${aggregateName}/:aggregateId`, async (req, res) => {
        await this.handleCQRSGetWithName(req, res, aggregateName, req.params.aggregateId);
      });
    });

    // Register Create commands
    this.cqrs.getRegisteredAggregates().forEach((aggregateName) => {
      const commandName = this.getCreateCommandNameFor(aggregateName);
      if (commandName) {
        logger.debug(`Registering POST /${aggregateName}`);
        expressApp.post(`/${aggregateName}`, async (req, res) => {
          if (req.body) {
            await this.handleCQRSCommandWithName(req, res, commandName, req.body);
          } else {
            await this.handleCQRSCommandWithName(req, res, commandName, {});
          }
        });
      }
    });

    // Register Delete commands
    this.cqrs.getRegisteredAggregates().forEach((aggregateName) => {
      const commandName = this.getDeleteCommandNameFor(aggregateName);
      if (commandName) {
        logger.debug(`Registering DELETE /${aggregateName}/:aggregateId`);
        expressApp.delete(`/${aggregateName}/:aggregateId`, async (req, res) => {
          if (req.body) {
            await this.handleCQRSCommandWithName(req, res, commandName, {...req.body, aggregateId: req.params.aggregateId});
          } else {
            await this.handleCQRSCommandWithName(req, res, commandName, {aggregateId: req.params.aggregateId});
          }
        });
      }
    });

    // Register submit commands
    this.cqrs.getRegisteredCommands().forEach((commandName) => {
      logger.debug(`Registering POST /submit/${commandName}`);
      expressApp.post(`/submit/${commandName}`, async (req, res) => {
        if (req.body) {
          await this.handleCQRSCommandWithName(req, res, commandName, {...req.body});
        } else {
          res.status(400).send({err: 'Missing body for command. At least an aggregateId must be passed'});
        }
      });
    });

    // Register commands
    this.cqrs.getRegisteredAggregates().forEach((aggregateName) => {
      logger.debug(`Registering POST /${aggregateName}/:aggregateId/:commandName`);
      expressApp.post(`/${aggregateName}/:aggregateId/:commandName`, async (req, res) => {
        const commandName = this.inferCommandName(req.params.aggregateName, req.params.commandName);
        if (!commandName) {
          res.status(404).send({err: `Unknown command ${req.params.commandName} for aggregate ${req.params.aggregateName}`});
          return;
        }
        if (req.body) {
          await this.handleCQRSCommandWithName(req, res, req.params.commandName, {...req.body, aggregateId: req.params.aggregateId});
        } else {
          await this.handleCQRSCommandWithName(req, res, req.params.commandName, {aggregateId: req.params.aggregateId});
        }
      });
    });
  }

  private inferCommandName(aggregateName, commandName) {
    return this.getCommandNameFor([ commandName, `${commandName}${aggregateName}`, `${commandName}${aggregateName}Command`]);
  }

  private getCreateCommandNameFor(aggregateName: string): string {
    return this.getCommandNameFor([ `Create${aggregateName}`, `Create${aggregateName}Command` ]);
  }

  private getDeleteCommandNameFor(aggregateName: string): string {
    return this.getCommandNameFor([ `Delete${aggregateName}`, `Delete${aggregateName}Command` ]);
  }

  private getCommandNameFor(names: string[]): string {
    for (const name of names) {
      if (this.cqrs.getRegisteredCommands().indexOf(name) >= 0) {
        return name;
      }
    }
    return undefined;
  }
}
