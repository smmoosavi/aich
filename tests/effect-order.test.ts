import { effect, flush, immediate, state } from '../src';
import { createLogStore } from './log';
describe('effect order', () => {
  test('effects update order', () => {
    const logs = createLogStore();
    let countO = state(0);
    let countA = state(10);
    let countB = state(100);
    effect(function outer() {
      const o = countO();
      logs.push(`outer effect ran with ${countO()}`);
      effect(function inner() {
        logs.push(`inner A effect ran with ${countA()} in outer ${o}`);
      });
      effect(function inner() {
        logs.push(`inner B effect ran with ${countB()} in outer ${o}`);
      });
      logs.push(`outer effect end with ${o}`);
    });
    flush();
    expect(logs.take()).toEqual([
      'outer effect ran with 0',
      'outer effect end with 0',
      'inner A effect ran with 10 in outer 0',
      'inner B effect ran with 100 in outer 0',
    ]);

    // a b
    countA(20);
    countB(200);
    flush();
    expect(logs.take()).toEqual([
      'inner A effect ran with 20 in outer 0',
      'inner B effect ran with 200 in outer 0',
    ]);

    // b a

    countB(300);
    countA(30);
    flush();
    expect(logs.take()).toEqual([
      'inner A effect ran with 30 in outer 0',
      'inner B effect ran with 300 in outer 0',
    ]);

    // o a
    countO(1);
    countA(40);
    flush();
    expect(logs.take()).toEqual([
      'outer effect ran with 1',
      'outer effect end with 1',
      'inner A effect ran with 40 in outer 1',
      'inner B effect ran with 300 in outer 1',
    ]);

    // a o
    countA(50);
    countO(2);
    flush();
    expect(logs.take()).toEqual([
      'outer effect ran with 2',
      'outer effect end with 2',
      'inner A effect ran with 50 in outer 2',
      'inner B effect ran with 300 in outer 2',
    ]);
  });

  test('effect with immediate update order', () => {
    const logs = createLogStore();
    let countO = state(0);
    let countA = state(10);
    let countB = state(100);
    effect(function outer() {
      const o = countO();
      logs.push(`outer effect ran with ${countO()}`);
      effect(function inner() {
        logs.push(`inner A effect ran with ${countA()} in outer ${o}`);
      });
      immediate(function inner() {
        logs.push(`inner B immediate ran with ${countB()} in outer ${o}`);
      });
      logs.push(`outer effect end with ${o}`);
    });
    flush();
    expect(logs.take()).toEqual([
      'outer effect ran with 0',
      'inner B immediate ran with 100 in outer 0',
      'outer effect end with 0',
      'inner A effect ran with 10 in outer 0',
    ]);

    // a b
    countA(20);
    countB(200);
    flush();
    expect(logs.take()).toEqual([
      'inner A effect ran with 20 in outer 0',
      'inner B immediate ran with 200 in outer 0', // unwanted: immediate effects should run before sibling effects
    ]);

    // b a

    countB(300);
    countA(30);
    flush();
    expect(logs.take()).toEqual([
      'inner A effect ran with 30 in outer 0',
      'inner B immediate ran with 300 in outer 0',
    ]);

    // o a
    countO(1);
    countA(40);
    flush();
    expect(logs.take()).toEqual([
      'outer effect ran with 1',
      'inner B immediate ran with 300 in outer 1',
      'outer effect end with 1',
      'inner A effect ran with 40 in outer 1',
    ]);

    // a o
    countA(50);
    countO(2);
    flush();
    expect(logs.take()).toEqual([
      'outer effect ran with 2',
      'inner B immediate ran with 300 in outer 2',
      'outer effect end with 2',
      'inner A effect ran with 50 in outer 2',
    ]);

    // b o
    countB(60);
    countO(3);
    flush();
    expect(logs.take()).toEqual([
      'outer effect ran with 3',
      'inner B immediate ran with 60 in outer 3',
      'outer effect end with 3',
      'inner A effect ran with 50 in outer 3',
    ]);
  });
});
