# known issues

## Effect cleanup errors may abort effect disposal

calling runCleanups(effect) can throw if a cleanup throws and when there is no
onError handler attached to that effect. When that happens the exception may
abort the remainder of effect disposal and cause subsequent effect executions
to be skipped. See the test "error in cleanup by rerun" in
tests/error-state.test.ts for a reproducer and more details.

## Effect order inconsistencies

The current implementation uses an `orderKey` system where effects are sorted and executed based on the order they were created. This has resolved most ordering issues:

✅ **Fixed**: Parent effects now execute before their child effects
✅ **Fixed**: Sibling effects execute in the order they were defined (creation order)

**Remaining issue:**

When multiple sibling effects are triggered together, `immediate` effects do not get priority over regular `effect` calls. Both types of effects are ordered purely by their creation order (orderKey).

The desired behavior for this remaining issue:

- **Immediates before effects**: Among siblings, `immediate` effects should execute before regular `effect` calls when both are triggered in the same flush cycle

See `tests/effect-order.test.ts` for complete test cases. Note that most test cases now pass - only the "immediate effects should run before sibling effects" scenario remains unresolved.
