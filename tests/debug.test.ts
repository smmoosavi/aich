import { cleanup, effect, flush, immediate, onError, state } from '../src';
import {
  debugEffect,
  ansiHighlightOptions,
  getName,
  resetDebug,
  setHighlightOptions,
  disableDebugNames,
  enableDebugNames,
} from './debug';
import { createLogStore } from './log';

describe('debug effect', () => {
  beforeAll(() => {
    enableDebugNames();
  });
  afterAll(() => {
    disableDebugNames();
  });
  test('empty effect', () => {
    resetDebug();
    const logs = createLogStore();
    const e1 = effect(() => {});
    debugEffect(e1, { logger: logs.push });
    expect(logs.takeJoined()).toMatchInlineSnapshot(`
      "

      ------------ Effect: #EF1 ------------
      Effect: #EF1
      --------------------------------------

      "
    `);

    const e2 = effect(function named() {});
    debugEffect(e2, { logger: logs.push });
    expect(logs.takeJoined()).toMatchInlineSnapshot(`
      "

      ------------ Effect: named#EF2 ------------
      Effect: named#EF2
      -------------------------------------------

      "
    `);

    const e3 = effect(() => {}, 'with-key');
    debugEffect(e3, { logger: logs.push });
    expect(logs.takeJoined()).toMatchInlineSnapshot(`
      "

      ------------ Effect: with-key#EF3 ------------
      Effect: with-key#EF3
      ----------------------------------------------

      "
    `);

    const e4 = effect(function named() {}, 'with-key');
    debugEffect(e4, { logger: logs.push });
    expect(logs.takeJoined()).toMatchInlineSnapshot(`
      "

      ------------ Effect: with-key#EF4 ------------
      Effect: with-key#EF4
      ----------------------------------------------

      "
    `);

    const e5 = immediate(function named() {}, 'with-key');
    debugEffect(e5, { logger: logs.push });
    expect(logs.takeJoined()).toMatchInlineSnapshot(`
      "

      ------------ Effect: with-key#IM1 ------------
      Effect: with-key#IM1
      ----------------------------------------------

      "
    `);
  });
  test('effect with state', () => {
    resetDebug();
    const logs = createLogStore();
    const count1 = state('hello');
    const count2 = state('world', 'with-key');
    const e1 = effect(() => {
      count1();
      count2();
    });
    flush();
    debugEffect(e1, { logger: logs.push });
    expect(logs.takeJoined()).toMatchInlineSnapshot(`
      "

      ------------ Effect: #EF1 ------------
      Effect: #EF1
        State: #ST1
        State: with-key#ST2
      --------------------------------------

      "
    `);
    debugEffect(e1, { logger: logs.push, debugValue: true });
    expect(logs.takeJoined()).toMatchInlineSnapshot(`
      "

      ------------ Effect: #EF1 ------------
      Effect: #EF1
        State: #ST1 = "hello"
        State: with-key#ST2 = "world"
      --------------------------------------

      "
    `);
    debugEffect(e1, { logger: logs.push, debugValue: (value) => `${value}` });
    expect(logs.takeJoined()).toMatchInlineSnapshot(`
      "

      ------------ Effect: #EF1 ------------
      Effect: #EF1
        State: #ST1 = hello
        State: with-key#ST2 = world
      --------------------------------------

      "
    `);
  });

  test('nested effects', () => {
    resetDebug();
    const logs = createLogStore();
    const count1 = state(0);
    const count2 = state(10);
    const e1 = effect(() => {
      count1();
      effect(() => {
        count2();
      });
      effect(() => {});
    });
    flush();
    debugEffect(e1, { logger: logs.push });
    expect(logs.takeJoined()).toMatchInlineSnapshot(`
      "

      ------------ Effect: #EF1 ------------
      Effect: #EF1
        State: #ST1
        Effect: #EF2
          State: #ST2
        Effect: #EF3
      --------------------------------------

      "
    `);
  });

  test('debug cleanup', () => {
    resetDebug();
    const logs = createLogStore();
    const e1 = effect(() => {
      cleanup(() => {}, 'with-key');
      effect(() => {
        cleanup(() => {});
      });
    });
    flush();
    debugEffect(e1, { logger: logs.push });
    expect(logs.takeJoined()).toMatchInlineSnapshot(`
      "

      ------------ Effect: #EF1 ------------
      Effect: #EF1
        Effect: #EF2
          Cleanup: #CL2
        Cleanup: with-key#CL1
      --------------------------------------

      "
    `);
  });
  test('with on error', () => {
    resetDebug();
    const logs = createLogStore();
    const e1 = effect(() => {
      onError(() => {}, 'catch-all');
      onError(() => {});
      effect(() => {
        onError(() => {});
        cleanup(() => {});
      });
      effect(() => {
        cleanup(() => {});
      });
      effect(() => {});
      cleanup(() => {});
    });
    flush();
    debugEffect(e1, { logger: logs.push });
    expect(logs.takeJoined()).toMatchInlineSnapshot(`
      "

      ------------ Effect: #EF1 ------------
      Effect: #EF1 [#CATCH2]
        OnError catch-all#CATCH1
        OnError #CATCH2 [catch-all#CATCH1 (from #EF1)]
        Effect: #EF2 [#CATCH3]
          OnError #CATCH3 [#CATCH2 (from #EF1) -> catch-all#CATCH1 (from #EF1)]
          Cleanup: #CL2 [#CATCH3]
        Effect: #EF3 [#CATCH2]
          Cleanup: #CL3 [#CATCH2]
        Effect: #EF4 [#CATCH2]
        Cleanup: #CL1 [#CATCH2]
      --------------------------------------

      "
    `);
  });

  test('default logger', () => {
    resetDebug();
    const logs = createLogStore();
    vi.spyOn(console, 'log').mockImplementation(logs.push);
    const e1 = effect(() => {
      state(0)();
    }, 'my-effect');
    flush();
    debugEffect(e1);
    expect(logs.takeJoined()).toMatchInlineSnapshot(`""`);
  });

  test('get name', () => {
    expect(getName(function myFunction() {})).toBe('myFunction');
    expect(getName(() => {})).toBe('');
  });

  describe('debug effect with highlight', () => {
    beforeAll(() => {
      setHighlightOptions(ansiHighlightOptions);
    });
    afterAll(() => {
      setHighlightOptions(undefined);
    });
    test('all', () => {
      resetDebug();
      const logs = createLogStore();
      const count1 = state(0);
      const count2 = state(0, 'with-key');
      const e1 = effect(function named() {
        count1();
        count2();
        onError(() => {}, 'catch-all');
        onError(() => {});
        effect(() => {
          onError(() => {});
          cleanup(() => {});
        });
        effect(() => {
          cleanup(() => {});
        });
        effect(() => {});
        effect(() => {}, 'with-key');
        cleanup(() => {});
        cleanup(() => {}, 'with-key');
      });
      flush();
      debugEffect(e1, { logger: logs.push });
      expect(logs.takeJoined()).toMatchInlineSnapshot(`
        "

        ------------ Effect: [36mnamed[0m[90m#EF1[0m ------------
        Effect: [36mnamed[0m[90m#EF1[0m [[36m[0m[90m#CATCH2[0m]
          OnError [36mcatch-all[0m[90m#CATCH1[0m
          OnError [36m[0m[90m#CATCH2[0m [[36mcatch-all[0m[90m#CATCH1[0m (from [36mnamed[0m[90m#EF1[0m)]
          State: [36m[0m[90m#ST1[0m
          State: [36mwith-key[0m[90m#ST2[0m
          Effect: [36m[0m[90m#EF2[0m [[36m[0m[90m#CATCH3[0m]
            OnError [36m[0m[90m#CATCH3[0m [[36m[0m[90m#CATCH2[0m (from [36mnamed[0m[90m#EF1[0m) -> [36mcatch-all[0m[90m#CATCH1[0m (from [36mnamed[0m[90m#EF1[0m)]
            Cleanup: [36m[0m[90m#CL3[0m [[36m[0m[90m#CATCH3[0m]
          Effect: [36m[0m[90m#EF3[0m [[36m[0m[90m#CATCH2[0m]
            Cleanup: [36m[0m[90m#CL4[0m [[36m[0m[90m#CATCH2[0m]
          Effect: [36m[0m[90m#EF4[0m [[36m[0m[90m#CATCH2[0m]
          Effect: [36mwith-key[0m[90m#EF5[0m [[36m[0m[90m#CATCH2[0m]
          Cleanup: [36m[0m[90m#CL1[0m [[36m[0m[90m#CATCH2[0m]
          Cleanup: [36mwith-key[0m[90m#CL2[0m [[36m[0m[90m#CATCH2[0m]
        -------------------------------------------

        "
      `);
    });
  });
});
