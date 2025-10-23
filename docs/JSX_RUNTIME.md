# JSX Runtime Example

This file demonstrates how to use the JSX runtime once the package is built.

## Example Usage

```tsx
import { jsx, jsxs, Fragment, createElement } from 'aich/jsx-runtime';

// Using the automatic JSX runtime (requires build)
function App() {
  return (
    <div className="app">
      <h1>Hello World</h1>
      <p>This is a JSX example</p>
    </div>
  );
}

// Using Fragment
function List() {
  return (
    <>
      <li>Item 1</li>
      <li>Item 2</li>
      <li>Item 3</li>
    </>
  );
}

// Component with props
interface ButtonProps {
  label: string;
  onClick: () => void;
}

function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

// Using createElement directly
function ClassicStyle() {
  return createElement(
    'div',
    { className: 'classic' },
    createElement('h2', null, 'Classic JSX'),
    createElement('p', null, 'Using createElement function'),
  );
}
```

## Configuration

To use JSX in your project, configure your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "aich"
  }
}
```

## Available Functions

- `jsx(type, props, key?)` - Creates a JSX element
- `jsxs(type, props, key?)` - Creates a JSX element with static children
- `jsxDEV(type, props, key?, isStatic?, source?, self?)` - Development version with debug info
- `Fragment` - Fragment component for grouping elements
- `createElement(type, props, ...children)` - Classic JSX factory
- `isValidElement(obj)` - Check if a value is a valid JSX element
- `cloneElement(element, props?, ...children)` - Clone an element with new props

## Console Output

All functions currently log their calls to the console for debugging purposes.
This is a demonstration implementation - in production, you would typically
render these elements to the DOM or use them in your framework.
