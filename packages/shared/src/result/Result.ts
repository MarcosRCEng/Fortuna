export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export const success = <T>(value: T): Result<T> => ({ ok: true, value });

export const failure = <E = Error>(error: E): Result<never, E> => ({ ok: false, error });
