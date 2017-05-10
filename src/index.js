const { Auth } = require('./auth/Auth.js');
const { AuthService } = require('./auth/service/AuthService.js');
const { SigningAuthService } = require('./auth/service/SigningAuthService.js');
const { Aggregate } = require('./cqrs/Aggregate.js');
const { AggregateCommand } = require('./cqrs/command/AggregateCommand.js');
const { AggregateCreatingCommand } = require('./cqrs/command/AggregateCreatingCommand.js');
const { Command } = require('./cqrs/command/Command.js');
const { CommandResult } = require('./cqrs/command/CommandResult.js');
const { CQRS } = require('./cqrs/CQRS.js');
const { AggregateCreatingEvent } = require('./cqrs/event/AggregateCreatingEvent.js');
const { AggregateEvent } = require('./cqrs/event/AggregateEvent.js');
const { Event } = require('./cqrs/event/Event.js');
const { AggregateEventStore } = require('./cqrs/event/store/AggregateEventStore.js');
const { InMemoryAggregateEventStore } = require('./cqrs/event/store/InMemoryAggregateEventStore.js');
// const { ExecutionContext } = require('./cqrs/ExecutionContext.js');
// const { IdGenerator } = require('./cqrs/IdGenerator.js');

module.exports = {
  auth: {
    Auth,
    service: {
      AuthService,
      SigningAuthService
    }
  },
  cqrs: {
    Aggregate,
    command: {
      AggregateCommand,
      AggregateCreatingCommand,
      Command,
      CommandResult
    },
    CQRS,
    event: {
      AggregateCreatingEvent,
      AggregateEvent,
      Event,
      store: {
        AggregateEventStore,
        InMemoryAggregateEventStore
      }
    }
  }
};
