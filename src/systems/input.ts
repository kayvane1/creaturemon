export function isConfirmKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'a';
}

export function isCancelKey(event: KeyboardEvent): boolean {
  return event.key === 'Escape' || event.key.toLowerCase() === 'x' || event.key.toLowerCase() === 'b';
}

