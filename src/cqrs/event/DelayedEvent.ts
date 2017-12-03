
export interface DelayedEvent {
  _isDelayed: true,
  _sendAfter: number,
  _isDelayedSend: false,
}

export function isDelayedEvent(object: any): object is DelayedEvent {
    return object._isDelayed;
}
