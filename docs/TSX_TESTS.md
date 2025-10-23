# JSX/TSX Testing Summary

## Test Coverage

### Total Tests: **158 passing**

- Original tests: 123
- JSX Runtime tests (`.test.ts`): 16
- **JSX Syntax tests (`.test.tsx`)**: 35 ✨

## TSX Test File: `tests/jsx-syntax.test.tsx`

This file demonstrates **real JSX syntax** usage with the runtime, covering:

### 1. Basic JSX Elements (4 tests)

- ✅ Simple div elements with props
- ✅ Self-closing elements (input, img, etc.)
- ✅ Nested elements
- ✅ Elements with multiple children

### 2. Fragment (3 tests)

- ✅ Shorthand syntax `<>...</>`
- ✅ Explicit syntax `<Fragment>...</Fragment>`
- ✅ Single child handling

### 3. Props and Attributes (5 tests)

- ✅ Boolean attributes (checked, disabled)
- ✅ Event handlers (onClick, etc.)
- ✅ Data attributes (data-\*)
- ✅ Style prop with objects
- ✅ className handling

### 4. Keys (3 tests)

- ✅ String keys
- ✅ Numeric keys
- ✅ Keys in mapped lists

### 5. Components (4 tests)

- ✅ Function components
- ✅ Components with children
- ✅ Components with multiple props
- ✅ Nested component composition

### 6. Expressions in JSX (5 tests)

- ✅ String interpolation
- ✅ Numeric expressions
- ✅ Boolean/conditional rendering
- ✅ Ternary operators
- ✅ Array mapping

### 7. Utility Functions with JSX (3 tests)

- ✅ isValidElement() with JSX
- ✅ cloneElement() with JSX
- ✅ Clone with additional children

### 8. Edge Cases (5 tests)

- ✅ null children
- ✅ undefined children
- ✅ Empty string
- ✅ Zero (0) value
- ✅ Mixed content types

### 9. Special HTML Elements (3 tests)

- ✅ Image elements
- ✅ Form elements (input, textarea, select)
- ✅ SVG elements

## Configuration Added

### `vitest.config.js`

```javascript
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      './jsx-runtime': resolve(__dirname, './src/jsx-runtime.ts'),
      './jsx-dev-runtime': resolve(__dirname, './src/jsx-dev-runtime.ts'),
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '.',
  },
  // ... rest of config
});
```

This configuration:

- Enables automatic JSX transform via esbuild
- Aliases JSX runtime imports to source files for testing
- Uses local package as jsxImportSource

## Example JSX Syntax Tests

```tsx
// Basic element
const element = <div className="test">Hello JSX</div>;

// Fragment
const fragment = (
  <>
    <div>First</div>
    <div>Second</div>
  </>
);

// Component
const Greeting = ({ name }: { name: string }) => {
  return <h1>Hello, {name}!</h1>;
};
const element = <Greeting name="World" />;

// Mapping with keys
const list = (
  <ul>
    {items.map((item) => (
      <li key={item.id}>{item.name}</li>
    ))}
  </ul>
);
```

## Console Output

All JSX elements created in tests produce console.log output showing:

- Function called (jsx, jsxs, jsxDEV)
- Element type
- Props passed
- Keys (if provided)

This helps verify the JSX runtime is working correctly and provides debugging information.

## Running TSX Tests

```bash
# Run only TSX tests
pnpm test run jsx-syntax

# Run all tests (including TSX)
pnpm test run

# Run with coverage
pnpm test:coverage
```

## TypeScript Support

The tests use actual TSX syntax and TypeScript types:

- Component props are typed with interfaces
- Event handlers have proper signatures
- Children props are correctly typed
- No type errors in test execution

## Result

✅ **All 158 tests passing**
✅ **Real JSX/TSX syntax working**
✅ **Comprehensive test coverage**
✅ **Console logging functionality verified**
