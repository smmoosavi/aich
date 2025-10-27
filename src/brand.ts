declare const __brand: unique symbol;
export type Brand<B> = { [__brand]: B };
