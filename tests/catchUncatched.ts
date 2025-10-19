// Utility to capture uncaught exceptions and unhandled promise rejections during tests.
// Returns a disposer function that removes the handlers and returns the captured errors.

import { onTestFinished } from 'vitest';

export function catchUncatchedNode() {
  let errors: any[] = [];
  function processOnUnhandledRejection(reason: unknown) {
    errors.push(reason);
  }

  function processOnUncaughtException(err: Error) {
    errors.push(err);
  }

  // Node.js events
  process.on('unhandledRejection', processOnUnhandledRejection);
  process.on('uncaughtException', processOnUncaughtException);

  function getErrors() {
    return errors;
  }

  function takeErrors() {
    const taken = errors;
    errors = [];
    return taken;
  }

  // Return disposer which removes listeners
  function dispose() {
    process.removeListener('unhandledRejection', processOnUnhandledRejection);
    process.removeListener('uncaughtException', processOnUncaughtException);
    return errors;
  }

  onTestFinished(() => {
    dispose();
  });

  return { dispose, getErrors, takeErrors };
}

export function catchUncatchedBrowser() {
  let errors: any[] = [];
  function windowOnErrorEvent(event: ErrorEvent) {
    errors.push(event.error);
  }

  function windowOnUnhandledRejection(event: PromiseRejectionEvent) {
    errors.push(event.reason);
  }

  window.addEventListener('error', windowOnErrorEvent);
  window.addEventListener('unhandledrejection', windowOnUnhandledRejection);

  function getErrors() {
    return errors;
  }

  function takeErrors() {
    const taken = errors;
    errors = [];
    return taken;
  }

  // Return disposer which removes listeners
  function dispose() {
    window.removeEventListener('error', windowOnErrorEvent);
    window.removeEventListener(
      'unhandledrejection',
      windowOnUnhandledRejection,
    );
    return errors;
  }

  onTestFinished(() => {
    dispose();
  });

  return { dispose, getErrors, takeErrors };
}

export function isJsDome(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      /jsdom/.test(navigator.userAgent)
    );
  } catch (e) {
    return false;
  }
}

export function isNodeEnvironment(): boolean {
  return typeof window === 'undefined';
}

export function catchUncatched() {
  if (isNodeEnvironment() || isJsDome()) {
    return catchUncatchedNode();
  }
  return catchUncatchedBrowser();
}
