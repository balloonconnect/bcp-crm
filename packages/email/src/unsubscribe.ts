/** Email defaults to "allowed to send" until an explicit unsubscribe — the industry-standard default, unlike WhatsApp's stricter model where a studio might require opt-in first. This function only encodes that platform-level rule. */
export function canSendTo(isUnsubscribed: boolean): boolean {
  return !isUnsubscribed;
}
