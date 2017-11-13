
export interface TransientEvent {
  transient: true,
}

export function isTransientEvent(object: any): object is TransientEvent {
    return object.transient;
}
