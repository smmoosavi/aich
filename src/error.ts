export function aggregateErrors(errors: any[]): AggregateError {
  if (errors.length === 1) {
    return errors[0];
  }
  const firstMsg =
    errors[0] instanceof Error ? errors[0].message : String(errors[0]);
  const msg = firstMsg
    ? `${firstMsg} (and ${errors.length - 1} more)`
    : `${errors.length} errors during flush`;
  return new AggregateError(errors, msg);
}
