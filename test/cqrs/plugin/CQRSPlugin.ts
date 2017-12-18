import { suite, test, slow, timeout } from 'mocha-typescript';
import { must } from 'must';
import { Context, InceptumApp } from 'inceptum';

import { CQRSPlugin } from '../../../src/cqrs/plugin/CQRSPlugin';
import { CQRS } from '../../../src/cqrs/CQRS';
import { MarkTodoDoneCommand, CreateTodoCommand,  TodoAggregate,  CreateTodoCommandExecutor,  MarkTodoDoneCommandExecutor,  TodoCreatedEventExecutor,  TodoMarkedDoneEventExecutor } from '../TodoExample';
import { Command } from '../../../src/cqrs/command/Command';

suite('cqrs/plugin/CQRSPlugin', () => {
  suite('Decorators are picked up', () => {
    test('Command classes are registered', async () => {
      const app = new InceptumApp();
      app.register(new CQRSPlugin());
      const context = app.getContext();
      context.registerSingletons(MarkTodoDoneCommand, CreateTodoCommand,  TodoAggregate,  CreateTodoCommandExecutor,  MarkTodoDoneCommandExecutor,  TodoCreatedEventExecutor,  TodoMarkedDoneEventExecutor);
      await app.start();
      const cqrs: CQRS = await context.getObjectByName('CQRS');
      cqrs.commandClasses.size.must.equal(2);
      Array.from(cqrs.commandClasses.values()).map((c) => c.name).sort().must.eql(['CreateTodoCommand', 'MarkTodoDoneCommand']);
      await app.stop();
    });
    test('Aggregate classes are registered', async () => {
      const app = new InceptumApp();
      app.register(new CQRSPlugin());
      const context = app.getContext();
      context.registerSingletons(MarkTodoDoneCommand, CreateTodoCommand,  TodoAggregate,  CreateTodoCommandExecutor,  MarkTodoDoneCommandExecutor,  TodoCreatedEventExecutor,  TodoMarkedDoneEventExecutor);
      await app.start();
      const cqrs: CQRS = await context.getObjectByName('CQRS');
      cqrs.aggregateClasses.size.must.equal(1);
      cqrs.aggregateClasses.keys().next().value.must.equal('Todo');
      await app.stop();
    });
    test('CommandExecutors are registered', async () => {
      const app = new InceptumApp();
      app.register(new CQRSPlugin());
      const context = app.getContext();
      context.registerSingletons(MarkTodoDoneCommand, CreateTodoCommand,  TodoAggregate,  CreateTodoCommandExecutor,  MarkTodoDoneCommandExecutor,  TodoCreatedEventExecutor,  TodoMarkedDoneEventExecutor);
      await app.start();
      const cqrs: CQRS = await context.getObjectByName('CQRS');
      cqrs.commandExecutors.length.must.equal(2);
      cqrs.commandExecutors.map((c) => c.constructor.name).sort().must.eql(['CreateTodoCommandExecutor', 'MarkTodoDoneCommandExecutor']);
      await app.stop();
    });
    test('EventExecutors are registered', async () => {
      const app = new InceptumApp();
      app.register(new CQRSPlugin());
      const context = app.getContext();
      context.registerSingletons(MarkTodoDoneCommand, CreateTodoCommand,  TodoAggregate,  CreateTodoCommandExecutor,  MarkTodoDoneCommandExecutor,  TodoCreatedEventExecutor,  TodoMarkedDoneEventExecutor);
      await app.start();
      const cqrs: CQRS = await context.getObjectByName('CQRS');
      cqrs.eventExecutors.length.must.equal(2);
      cqrs.eventExecutors.map((c) => c.constructor.name).sort().must.eql(['TodoCreatedEventExecutor', 'TodoMarkedDoneEventExecutor']);
      await app.stop();
    });
  });
});
