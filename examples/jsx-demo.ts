/**
 * JSX Runtime Console Output Demonstration
 *
 * This file shows examples of console.log output from the JSX runtime functions.
 * Run this file to see the logging in action.
 */

import {
  jsx,
  jsxs,
  jsxDEV,
  Fragment,
  createElement,
  isValidElement,
  cloneElement,
} from '../src/jsx-runtime.js';

console.log('\n=== JSX Runtime Demo ===\n');

// 1. Basic jsx() call
console.log('1. Creating a simple div:');
const div = jsx('div', { className: 'container', id: 'main' });

// 2. jsx() with children
console.log('\n2. Creating a div with children:');
const divWithChildren = jsx('div', {
  className: 'parent',
  children: 'Hello World',
});

// 3. jsxs() with static children
console.log('\n3. Creating an element with static children:');
const list = jsxs('ul', {
  children: [
    jsx('li', { children: 'Item 1' }),
    jsx('li', { children: 'Item 2' }),
    jsx('li', { children: 'Item 3' }),
  ],
});

// 4. jsxDEV() with debug info
console.log('\n4. Development mode JSX:');
const button = jsxDEV(
  'button',
  { onClick: () => alert('Clicked!'), children: 'Click Me' },
  'btn-1',
  false,
  { fileName: 'demo.ts', lineNumber: 42, columnNumber: 10 },
  undefined,
);

// 5. Fragment
console.log('\n5. Creating a Fragment:');
const fragment = jsx(Fragment, {
  children: [
    jsx('span', { children: 'First' }),
    jsx('span', { children: 'Second' }),
  ],
});

// 6. createElement (classic API)
console.log('\n6. Classic createElement:');
const classic = createElement(
  'section',
  { className: 'classic' },
  'Child 1',
  'Child 2',
  'Child 3',
);

// 7. isValidElement
console.log('\n7. Validating elements:');
isValidElement(div);
isValidElement({ invalid: 'object' });
isValidElement(null);

// 8. cloneElement
console.log('\n8. Cloning an element:');
const original = jsx(
  'input',
  { type: 'text', placeholder: 'Original' },
  'input-1',
);
const cloned = cloneElement(
  original,
  { placeholder: 'Cloned', disabled: true },
  'New child content',
);

// 9. Component function
console.log('\n9. Using a component function:');
const Greeting = (props: { name: string }) => {
  return jsx('h1', { children: `Hello, ${props.name}!` });
};

const greeting = jsx(Greeting, { name: 'World' });

console.log('\n=== Demo Complete ===\n');
console.log(
  'All functions log their calls to help with debugging and understanding the JSX runtime.',
);
