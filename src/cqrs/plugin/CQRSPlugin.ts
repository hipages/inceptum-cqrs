import { Stream } from 'stream';
import { SingletonDefinition, Plugin,  InceptumApp,  LogManager,  BaseSingletonDefinition,  AbstractObjectDefinitionInspector, Lazy, StartMethod, Autowire, AutowireGroupDefinitions, Logger } from 'inceptum';
import { CQRS } from '../CQRS';
import { Command } from '../command/Command';

import { SwaggerCQRSMiddleware } from './SwaggerCQRSMiddleware';

const logger = LogManager.getLogger(__filename);

// interface AggregateToRegister {
//   aggregateName: String,
//   aggregateClass: Function,
// }

// class AggregateRegisterUtil {
//   private aggregatesToRegister: AggregateToRegister[] = [];
//   private cqrs: CQRS;

//   doRegister() {
//     this.aggregatesToRegister.forEach((def: AggregateToRegister) => {
//       logger.info(`Registering aggregate ${def.aggregateName} into CQRS`);
//       this.cqrs.registerAggregateClass(def.aggregateName as string, def.aggregateClass);
//     });
//   }
// }

// class AggregateInspector extends AbstractObjectDefinitionInspector {
//   definition: BaseSingletonDefinition<AggregateRegisterUtil>;
//   aggregatesToRegister: AggregateToRegister[] = [];

//   constructor(definition: BaseSingletonDefinition<AggregateRegisterUtil>) {
//     super();
//     this.definition = definition;
//     this.definition.setPropertyByValue('aggregatesToRegister', this.aggregatesToRegister);
//   }

//   // tslint:disable-next-line:prefer-function-over-method
//   interestedIn(objectDefinition) {
//     return (objectDefinition instanceof SingletonDefinition)
//       && (objectDefinition.getProducedClass().aggregateName !== undefined);
//   }

//   /**
//    * @param {SingletonDefinition} objectDefinition singleton definition
//    */
//   // tslint:disable-next-line:prefer-function-over-method
//   doInspect(objectDefinition: SingletonDefinition<any>) {
//     const aggregateName: string = objectDefinition.getProducedClass().aggregateName;
//     this.aggregatesToRegister.push({
//       aggregateName,
//       aggregateClass: objectDefinition.getProducedClass(),
//     });
//   }
// }

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
    const singletonDefinition = new BaseSingletonDefinition<CQRS>(CQRS);
    context.registerDefinition(singletonDefinition);
    if (this.configurator) {
      this.configurator(singletonDefinition);
    }

    // const definition = new BaseSingletonDefinition<AggregateRegisterUtil>(AggregateRegisterUtil);
    // definition.withLazyLoading(false);
    // definition.startFunction('doRegister');
    // definition.setPropertyByRef('cqrs', 'CQRS');
    // context.registerDefinition(definition);
    // context.addObjectDefinitionInspector(new AggregateInspector(definition));

    const express = pluginContext.get('WebPlugin/APP');
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
}
