import * as http from 'http';
import { suite, test, slow, timeout } from 'mocha-typescript';
import { must } from 'must';
import { Express, Request, Response, Application, IRouterMatcher } from 'express';
import { mock, when, anything, verify, instance } from 'ts-mockito';
import * as sinon from 'sinon';
import { Context, TestInceptumApp } from 'inceptum';
import { SimpleCQRSMiddleware } from '../../../src/cqrs/plugin/SimpleCQRSMiddleware';
import { CQRS } from '../../../src/cqrs/CQRS';
import { CQRSPlugin } from '../../../src/cqrs/plugin/CQRSPlugin';
import { MarkTodoDoneCommand, TodoAggregate, MarkTodoDoneCommandExecutor, TodoCreatedEventExecutor, TodoMarkedDoneEventExecutor, TodoCreatedEvent } from '../TodoExample';
import { InMemoryAggregateEventStore } from '../../../src/cqrs/event/store/InMemoryAggregateEventStore';
import { AggregateCommand, AggregateCommandOptions } from '../../../src/cqrs/command/AggregateCommand';
import { CQRSCommand, CQRSCommandExecutor } from '../../../src/cqrs/plugin/CQRSDecorators';
import { Auth } from '../../../src/auth/Auth';
import { AggregateCreatingCommand } from '../../../src/cqrs/command/AggregateCreatingCommand';
import { CommandExecutor } from '../../../src/cqrs/command/CommandExecutor';
import { ExecutionContext } from '../../../src/cqrs/ExecutionContext';
import { Command } from '../../../src/cqrs/command/Command';

const swaggerOperationCqrsCommandReq = {
  swagger: {
    operation: {
      'x-inceptum-cqrs-command': 'CreateTodoCommand',
    },
  },
};
const swaggerPathCqrsCommandReq = {
  swagger: {
    path: {
      'x-inceptum-cqrs-command': 'commandPath',
    },
  },
};
const swaggerOperationCqrsGetReq = {
  swagger: {
    operation: {
      'x-inceptum-cqrs-get': 'TheType',
    },
    params: {
      id: { value: '587678d0-df01-11e7-9325-f329215fa342' },
    },
  },
};
const swaggerPathCqrsGetReq = {
  swagger: {
    path: {
      'x-inceptum-cqrs-get': 'TheType',
    },
    params: {
      id: { value: '587678d0-df01-11e7-9325-f329215fa342' },
    },
  },
};

class MockableExpress {
  delete(...handlers: any[]): any {
    return undefined;
  }
  use(...handlers: any[]): any {
    return undefined;
  }
  get(...handlers: any[]): any {
    return undefined;
  }
  post(...handlers: any[]): any {
    return undefined;
  }
}

@CQRSCommand
export class CreateTodoCommand extends AggregateCreatingCommand {
  title: string;
  description: string;

  constructor(obj: any = {}) {
    obj.aggregateType = 'Todo';
    super(obj);
    this.title = 'my title';
    this.description = 'my desc';
    this.aggregateId = '123456';
    this.issuerAuth = new Auth('user', 'userId1', ['registered']);
  }
}

@CQRSCommandExecutor
export class CreateTodoCommandExecutor extends CommandExecutor<CreateTodoCommand, TodoAggregate> {
  // tslint:disable-next-line:prefer-function-over-method
  async doExecute(command: CreateTodoCommand, executionContext: ExecutionContext, aggregate) {
    executionContext.getCommandResultForCommand(command).setNewAggregate('test aggreate', '123456');

    await executionContext.commitEvent(new TodoCreatedEvent(
      command.title,
      command.getIssuerAuth().getFullId(),
      command.description,
      command.getAggregateId(),
    ));
  }
  // tslint:disable-next-line:prefer-function-over-method
  async validate(command: CreateTodoCommand) {
    if (!command.title) {
      throw new Error('Need to specify a title for the Todo');
    }
    if (!command.description) {
      throw new Error('Need to specify a description for the Todo');
    }
  }
  // tslint:disable-next-line:prefer-function-over-method
  async validateAuth(command: CreateTodoCommand) {
    if (command.issuerAuth.getType() !== 'user') {
      throw new Error(`Only users can execute this command. Provided auth for an entity of type ${command.issuerAuth.getType()}`);
    }
  }

  // tslint:disable-next-line:prefer-function-over-method
  public canExecute(command: Command): boolean {
    return command instanceof CreateTodoCommand;
  }
}

suite('cqrs/plugin/SimpleCQRSMiddlewareTest', () => {
  suite('Registers routes to express', () => {
    const cqrs = new CQRS(new InMemoryAggregateEventStore([]));
    cqrs.registerAggregateClass('Todo', TodoAggregate);
    cqrs.registerCommandClass('MarkTodoDoneCommand', MarkTodoDoneCommand);
    cqrs.registerCommandClass('CreateTodoCommand', CreateTodoCommand);

    const expressClassMock = mock<MockableExpress>(MockableExpress);
    const expressInstance = instance(expressClassMock);

    const middleware = new SimpleCQRSMiddleware();
    middleware.setCQRS(cqrs);
    middleware.register(expressInstance);

    test('Registers Get', () => {
      verify(expressClassMock.get('/Todo/:aggregateId', anything())).once();
    });
    test('Registers Post for create', () => {
      verify(expressClassMock.post('/Todo', anything())).once();
    });
    test('Registers Post for CreateTodoCommand', () => {
      verify(expressClassMock.post('/submit/CreateTodoCommand', anything())).once();
    });
    test('Registers Post for MarkTodoDoneCommand', () => {
      verify(expressClassMock.post('/submit/MarkTodoDoneCommand', anything())).once();
    });
    test('Registers generic command executor for aggregate', () => {
      verify(expressClassMock.post('/Todo/:aggregateId/:commandName', anything())).once();
    });
    test('Does not register handler for delete', () => {
      verify(expressClassMock.delete(anything())).never();
    });
  });
});

// suite('cqrs/plugin/SwaggerCQRSMiddleware', () => {

//   suite('Can set CQRS object', () => {
//     test('set the CQRS object correctly', async () => {
//       const swaggerMidware = new SimpleCQRSMiddleware();
//       const app = new TestInceptumApp();
//       app.register(new CQRSPlugin());
//       const context = app.getContext();
//       context.registerSingletons(MarkTodoDoneCommand, CreateTodoCommand, TodoAggregate, CreateTodoCommandExecutor, MarkTodoDoneCommandExecutor, TodoCreatedEventExecutor, TodoMarkedDoneEventExecutor);
//       await app.start();
//       const cqrs = await context.getObjectByName('CQRS');
//       const result = swaggerMidware.setCQRS(cqrs);
//       swaggerMidware.cqrs.must.eql(cqrs);
//       app.stop();
//     });
//   });

//   suite('Can register in swagger', () => {
//     test('Register CQRS correctly in the app ', async () => {
//       const swaggerMidware = new SwaggerCQRSMiddleware();
//       const app = new TestInceptumApp();
//       app.register(new CQRSPlugin());
//       swaggerMidware.register(app);
//       const context = app.getContext();
//       context.registerSingletons(MarkTodoDoneCommand, CreateTodoCommand, TodoAggregate, CreateTodoCommandExecutor, MarkTodoDoneCommandExecutor, TodoCreatedEventExecutor, TodoMarkedDoneEventExecutor);
//       await app.start();
//       const cqrs = await context.getObjectByName('CQRS');
//       // const result = swaggerMidware.register(app);
//       // swaggerMidware.cqrs.must.eql(cqrs);
//       await app.stop();
//     });
//   });

//   suite('can get payload from request', () => {
//     test('correctly retrieve payload with name', async () => {
//       const swaggerMidware = new SwaggerCQRSMiddleware();
//       const req = {
//         swagger: {
//           params: {
//             testPayload: {
//               value: 'test value',
//             },
//           },
//         },
//       };
//       const bodyParamName = 'testPayload';
//       const result = swaggerMidware.getPayload(req, bodyParamName);
//       result.must.eql('test value');
//     });
//   });

//   suite('handle CQRS command with name', () => {
//     test('successfully executes a command and return 201', async () => {
//       const swaggerMidware = new SwaggerCQRSMiddleware();
//       const req = {
//         swagger: {
//           apiPath: 'fake path',
//           swaggerObject: {
//             basePath: '/var/test',
//           },
//           params: {
//             testPayload: {
//               value: { },
//             },
//           },
//         },
//       };
//       const res = {
//         header: (...headerValue) => {
//           return headerValue;
//         },
//         status: (code) => {
//           code.must.eql(201);
//         },
//         send: (sendValue) => {
//           return sendValue;
//         },
//       };
//       const eventExecutors = [new TodoCreatedEventExecutor(), new TodoMarkedDoneEventExecutor()];
//       const app = new TestInceptumApp();
//       app.register(new CQRSPlugin());
//       const context = app.getContext();
//       await app.start();
//       const cqrs = new CQRS(new InMemoryAggregateEventStore([]));
//       cqrs.registerCommandExecutor(new CreateTodoCommandExecutor());
//       cqrs.registerAggregateClass('Todo', TodoAggregate);
//       cqrs.registerCommandClass('CreateTodoCommand', CreateTodoCommand);
//       eventExecutors.forEach((ee) => cqrs.registerEventExecutor(ee));

//       swaggerMidware.setCQRS(cqrs);

//       const commandName = 'CreateTodoCommand';
//       const bodyParamName = 'testPayload';
//       const result = swaggerMidware.handleCQRSCommand(swaggerOperationCqrsCommandReq, res);
//       await app.stop();
//     });
//   });

//   suite('handle CQRS get with name', () => {
//     test('successfully executes handleCQRSGet', async () => {
//       const swaggerMidware = new SwaggerCQRSMiddleware();
//       const res = {
//         header: (...headerValue) => {
//           return headerValue;
//         },
//         status: (code) => {
//           return code;
//         },
//         send: (sendValue) => {
//           sendValue.must.eql({
//             aggregateName: 'test aggregate',
//             aggregateType: 'TheType',
//             aggregateId: '587678d0-df01-11e7-9325-f329215fa342',
//           });
//         },
//       };
//       const cqrs = new CQRS(new InMemoryAggregateEventStore([]));
//       sinon.stub(cqrs, 'getAggregate').returns({
//         aggregateName: 'test aggregate',
//         aggregateType: 'TheType',
//         aggregateId: '587678d0-df01-11e7-9325-f329215fa342',
//       });
//       swaggerMidware.setCQRS(cqrs);
//       const result = await swaggerMidware.handleCQRSGet(swaggerOperationCqrsGetReq, res);
//     });
//   });
// });
