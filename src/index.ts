import * as _Auth from './auth/Auth.js';
import * as _AuthService from './auth/service/AuthService';
import * as _SigningAuthService from './auth/service/SigningAuthService';
import * as _Aggregate from './cqrs/Aggregate';
import * as _AggregateCommand from './cqrs/command/AggregateCommand';
import * as _AggregateCreatingCommand from './cqrs/command/AggregateCreatingCommand';
import * as _Command from './cqrs/command/Command';
import * as _CommandResult from './cqrs/command/CommandResult';
import * as _CQRS from './cqrs/CQRS';
import * as _AggregateCreatingEvent from './cqrs/event/AggregateCreatingEvent';
import * as _AggregateEvent from './cqrs/event/AggregateEvent';
import * as _Event from './cqrs/event/Event';
import * as _AggregateEventStore from './cqrs/event/store/AggregateEventStore';
import * as _InMemoryAggregateEventStore from './cqrs/event/store/InMemoryAggregateEventStore';

export * from 'inceptum';

export namespace auth {
  export const Auth = _Auth.Auth;
  
  export namespace service {
    export const AuthService = _AuthService.AuthService;
    export const SigningAuthService = _SigningAuthService.SigningAuthService;
  }
}

export namespace cqrs {
  export const Aggregate = _Aggregate.Aggregate;
  export const CQRS = _CQRS.CQRS;

  export namespace command {
    export const Command = _Command.Command;
    export type CommandOptions = _Command.CommandOptions;
    export const AggregateCommand = _AggregateCommand.AggregateCommand;
    export type AggregateCommandOptions = _AggregateCommand.AggregateCommandOptions;
    export const AggregateCreatingCommand = _AggregateCreatingCommand.AggregateCreatingCommand;
    export type AggregateCreatingCommandOptions = _AggregateCreatingCommand.AggregateCreatingCommandOptions;
    export const CommandResult = _CommandResult.CommandResult;
  }

  export namespace event {
    export const Event = _Event.Event;
    export const AggregateEvent = _AggregateEvent.AggregateEvent;
    export const AggregateCreatingEvent = _AggregateCreatingEvent.AggregateCreatingEvent;

    export namespace store {
      export const AggregateEventStore = _AggregateEventStore.AggregateEventStore;
      export const InMemoryAggregateEventStore = _InMemoryAggregateEventStore.InMemoryAggregateEventStore;
    }
  }
}
