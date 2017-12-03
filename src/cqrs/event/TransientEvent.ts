
export interface TransientEvent {
  _transient: true,
}

export function isTransientEvent(object: any): object is TransientEvent {
    return object._transient;
}
