# known issues

## Effect cleanup errors may abort effect disposal

calling runCleanups(effect) can throw if a cleanup throws and when there is no
onError handler attached to that effect. When that happens the exception may
abort the remainder of effect disposal and cause subsequent effect executions
to be skipped. See the test "error in cleanup by rerun" in
tests/error-state.test.ts for a reproducer and more details.

## Effect order inconsistencies

The current implementation of effect ordering has some inconsistencies, especially when dealing with nested effects.

Currently, the order of effect execution is determined by **the order in which state is set**, not by the order in which effects are defined. When multiple states are updated, effects are triggered in the order of the state updates that caused them to run.

The desired behavior is for effect execution order to be determined by **the order in which effects are defined**, following these rules:

1. **Parent before children**: Parent effects should always execute before their child effects
2. **Immediates before effects**: Among siblings, `immediate` effects should execute before regular `effect` calls
3. **Siblings by definition order**: Sibling effects should execute in the order they were defined

See `tests/effect-order.test.ts` for complete test cases demonstrating these issues.
