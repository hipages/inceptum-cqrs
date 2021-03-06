import { Stream } from 'stream';
import { SingletonDefinition, Plugin,  InceptumApp,  LogManager,
         BaseSingletonDefinition,  AbstractObjectDefinitionInspector,
         Lazy, StartMethod, Autowire, AutowireGroupDefinitions,
         Logger, WebPlugin, NewrelicUtil } from 'inceptum';
import { CQRS } from '../CQRS';
import { Command } from '../command/Command';

import { ReturnToCallerError } from '../error/ReturnToCallerError';
import { SwaggerCQRSMiddleware } from './SwaggerCQRSMiddleware';

const logger = LogManager.getLogger(__filename);

const newrelic = NewrelicUtil.getNewrelicIfAvailable();

@Lazy(false)
export class WireCQRSPlugin {
  @Autowire('CQRS')
  cqrs: CQRS;

  middleware: SwaggerCQRSMiddleware;

  @StartMethod
  wire() {
    this.middleware.setCQRS(this.cqrs);
  }
}


export class CQRSPlugin implements Plugin {
  configurator: (singletonDefinition: BaseSingletonDefinition<CQRS>) => void;
  name = 'CQRSPlugin';

  constructor(cqrsDefinitionConfigurator?: (singletonDefinition: BaseSingletonDefinition<CQRS>) => void) {
    this.configurator = cqrsDefinitionConfigurator;
  }

  // tslint:disable-next-line:prefer-function-over-method
  async willStart(app: InceptumApp, pluginContext?: Map<String, any>): Promise<void> {
    logger.info('Registering CQRS support');
    const context = app.getContext();
    try {
      const singletonDefinition = new BaseSingletonDefinition<CQRS>(CQRS);
      context.registerDefinition(singletonDefinition);
      if (this.configurator) {
        this.configurator(singletonDefinition);
      }
    } catch (e) {
      logger.error(e);
    }

    const express = pluginContext.get(WebPlugin.CONTEXT_APP_KEY);
    if (express) {
      const middleware = new SwaggerCQRSMiddleware();
      middleware.register(express);

      const wireDefinition = new BaseSingletonDefinition<WireCQRSPlugin>(WireCQRSPlugin);
      // wireDefinition.withLazyLoading(false);
      wireDefinition.setPropertyByValue('middleware', middleware);
      // wireDefinition.setPropertyByRef('cqrs', 'CQRS');
      // wireDefinition.startFunction('wire');
      context.registerDefinition(wireDefinition);
    }
  }

  async didStart(app: InceptumApp, pluginContext?: Map<String, any>): Promise<void> {
    const express = pluginContext.get(WebPlugin.CONTEXT_APP_KEY);
    if (express) {
      express.use((err, req, res, next) => {
        if (newrelic) {
          newrelic.noticeError(err);
        }
        if (err instanceof ReturnToCallerError) {
          res.status(err.httpStatusCode).send(err.getAllInfoToReturn());
        } else if (req.swagger) {
          res.status(500).send({message: 'Internal Server Error'});
        } else {
          next(err);
        }
      });
    }
  }
}
