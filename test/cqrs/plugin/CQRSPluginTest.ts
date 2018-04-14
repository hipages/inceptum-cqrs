import { suite, test, slow, timeout } from 'mocha-typescript';
import { must } from 'must';
import { Context, TestInceptumApp } from 'inceptum';

import { CQRSPlugin } from '../../../src/cqrs/plugin/CQRSPlugin';
import { CQRS } from '../../../src/cqrs/CQRS';
import { MarkTodoDoneCommand, CreateTodoCommand,  TodoAggregate,  CreateTodoCommandExecutor,  MarkTodoDoneCommandExecutor,  TodoCreatedEventExecutor,  TodoMarkedDoneEventExecutor } from '../TodoExample';
import { Command } from '../../../src/cqrs/command/Command';

@suite
class CQRSPluginTest {
  // suite('Decorators are picked up', () => {
    protected app;

    before() {
      this.app = new TestInceptumApp();
    }

    after() {
      this.app.stop();
    }

    @test
    async 'Command classes are registered'() {
      this.app.register(new CQRSPlugin());
      const context = this.app.getContext();
      context.registerSingletons(MarkTodoDoneCommand, CreateTodoCommand,  TodoAggregate,  CreateTodoCommandExecutor,  MarkTodoDoneCommandExecutor,  TodoCreatedEventExecutor,  TodoMarkedDoneEventExecutor);
      await this.app.start();
      const cqrs: CQRS = await context.getObjectByName('CQRS');
      cqrs.commandClasses.size.must.equal(2);
      Array.from(cqrs.commandClasses.values()).map((c) => c.name).sort().must.eql(['CreateTodoCommand', 'MarkTodoDoneCommand']);
      await this.app.stop();
    }

    @test
    async 'Aggregate classes are registered'() {
      this.app.register(new CQRSPlugin());
      const context = this.app.getContext();
      context.registerSingletons(MarkTodoDoneCommand, CreateTodoCommand,  TodoAggregate,  CreateTodoCommandExecutor,  MarkTodoDoneCommandExecutor,  TodoCreatedEventExecutor,  TodoMarkedDoneEventExecutor);
      await this.app.start();
      const cqrs: CQRS = await context.getObjectByName('CQRS');
      cqrs.aggregateClasses.size.must.equal(1);
      cqrs.aggregateClasses.keys().next().value.must.equal('Todo');
      await this.app.stop();
    }

    @test
    async 'CommandExecutors are registered'() {
      const app = new TestInceptumApp();
      app.register(new CQRSPlugin());
      const context = app.getContext();
      context.registerSingletons(MarkTodoDoneCommand, CreateTodoCommand,  TodoAggregate,  CreateTodoCommandExecutor,  MarkTodoDoneCommandExecutor,  TodoCreatedEventExecutor,  TodoMarkedDoneEventExecutor);
      await app.start();
      const cqrs: CQRS = await context.getObjectByName('CQRS');
      cqrs.commandExecutors.length.must.equal(2);
      cqrs.commandExecutors.map((c) => c.constructor.name).sort().must.eql(['CreateTodoCommandExecutor', 'MarkTodoDoneCommandExecutor']);
      await app.stop();
    }
    @test
    async 'EventExecutors are registered'() {
      const app = new TestInceptumApp();
      app.register(new CQRSPlugin());
      const context = app.getContext();
      context.registerSingletons(MarkTodoDoneCommand, CreateTodoCommand,  TodoAggregate,  CreateTodoCommandExecutor,  MarkTodoDoneCommandExecutor,  TodoCreatedEventExecutor,  TodoMarkedDoneEventExecutor);
      await app.start();
      const cqrs: CQRS = await context.getObjectByName('CQRS');
      cqrs.eventExecutors.length.must.equal(2);
      cqrs.eventExecutors.map((c) => c.constructor.name).sort().must.eql(['TodoCreatedEventExecutor', 'TodoMarkedDoneEventExecutor']);
      await app.stop();
    }
}
