import { suite, test, slow, timeout } from 'mocha-typescript';
import { must } from 'must';
import { Command } from '../../../src/cqrs/command/Command';
import { AggregateCommand, AggregateCommandOptions } from '../../../src/cqrs/command/AggregateCommand';

class TestCommand1 extends AggregateCommand {
  myVar2: string;
  myVar1: string;
  constructor(obj: AggregateCommandOptions & { myVar1: string, myVar2?: string }) {
    super(obj);
    this.myVar1 = obj.myVar1;
    this.myVar2 = obj.myVar2;
  }

  getVar1(): string {
    return this.myVar1;
  }

  getVar2(): string {
    return this.myVar2;
  }

  // tslint:disable-next-line
  async validateWithAggregate(executionContext, aggregate) {
  }

  // tslint:disable-next-line
  async doExecuteWithAggregate(executionContext, aggregate) {
    throw new Error('Not implemented yet.');
  }

  // tslint:disable-next-line
  async validateAuthWithAggregate(executionContext, aggregate) {
    throw new Error('Not implemented yet.');
  }
}

Command.registerCommandClass(TestCommand1);

suite('cqrs/command/Command', () => {
  suite('Serialisation', () => {
    test('Command is deserialised properly', () => {
      const command = Command.fromObject({myVar1: 'hi', myVar2: 'hello' }, 'TestCommand1');
      (command instanceof TestCommand1).must.be.equal(true);
      const typed = command as TestCommand1;
      typed.getVar1().must.equal('hi');
      typed.getVar2().must.equal('hello');
    });
  });
});
