
import { RegisterInGroup } from 'inceptum';

export function CQRSCommandExecutor(target: any) {
  RegisterInGroup('cqrs:commandExecutor')(target);
}

export function CQRSCommand(target: any) {
  RegisterInGroup('cqrs:command')(target);
}

export function CQRSEvent(target: any) {
  RegisterInGroup('cqrs:event')(target);
}
