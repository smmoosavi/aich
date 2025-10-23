# known issues

## Effect cleanup errors may abort effect disposal

calling runCleanups(effect) can throw if a cleanup throws and when there is no
onError handler attached to that effect. When that happens the exception may
abort the remainder of effect disposal and cause subsequent effect executions
to be skipped. See the test "error in cleanup by rerun" in
tests/error-state.test.ts for a reproducer and more details.
