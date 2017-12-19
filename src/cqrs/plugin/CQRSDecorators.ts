
import { RegisterInGroup, Lazy } from 'inceptum';

export function CQRSAggregate(target: any) {
  RegisterInGroup('cqrs:aggregate')(target);
  Lazy(false)(target);
}

export function CQRSCommandExecutor(target: any) {
  RegisterInGroup('cqrs:commandExecutor')(target);
  Lazy(false)(target);
}

export function CQRSCommand(target: any) {
  RegisterInGroup('cqrs:command')(target);
  Lazy(false)(target);
}

export function CQRSEventExecutor(target: any) {
  RegisterInGroup('cqrs:eventExecutor')(target);
  Lazy(false)(target);
}

export function CQRSEventListener(target: any) {
  RegisterInGroup('cqrs:eventListener')(target);
  Lazy(false)(target);
}
