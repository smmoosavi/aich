export function useNoBail() {
  chai.use((_chai, utils) => {
    const { Assertion } = _chai;
    const flag = _chai.util.flag;

    // Step 1: add `.noBail` property
    Assertion.addProperty('noBail', function (this: any) {
      flag(this, 'noBail', true);
    });

    // Step 2: patch `.assert()` to respect `noBail`
    const originalAssert = Assertion.prototype.assert;
    Assertion.prototype.assert = function (...args) {
      const noBail = flag(this, 'noBail');
      if (!noBail) {
        return originalAssert.call(this, ...args);
      }

      try {
        return originalAssert.call(this, ...args);
      } catch (err) {
        onTestFinished(() => {
          throw err;
        });
        return this;
      }
    };
  });
}

interface NoBailMatcher {
  noBail: this;
}

declare module 'vitest' {
  interface Matchers<T = any> extends NoBailMatcher {}
}
