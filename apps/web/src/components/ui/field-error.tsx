/**
 * A field's own error, under the field. Pair with `fieldErrorProps` on the
 * control so screen readers announce it with the field.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="m-0 text-sm text-destructive">
      {message}
    </p>
  );
}

export function fieldErrorProps(
  id: string,
  message?: string,
): { 'aria-invalid'?: true; 'aria-describedby'?: string } {
  return message
    ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` }
    : {};
}
