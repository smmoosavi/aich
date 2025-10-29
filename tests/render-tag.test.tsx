import { prettyDOM } from './pretty-dom';
import { debugContext } from '../src/render/debug-ctx';
import { flush, state } from '../src';
import { render } from '../src/dom';

describe('render', () => {
  it('should render text node', () => {
    const container = document.createElement('div');
    const unmount = render(container, 'Hello World');
    expect(prettyDOM(container)).toMatchInlineSnapshot(`"Hello World"`);

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });
  it('should render thunk text node', () => {
    const container = document.createElement('div');
    const unmount = render(container, () => 'Hello World');
    expect(prettyDOM(container)).toMatchInlineSnapshot(`"Hello World"`);

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });
  it('should render state text node', () => {
    const container = document.createElement('div');
    const name = state('World');
    const unmount = render(container, () => `Hello ${name()}`);
    expect(prettyDOM(container)).toMatchInlineSnapshot(`"Hello World"`);

    name('Universe');
    expect(prettyDOM(container)).toMatchInlineSnapshot(`"Hello World"`);

    flush();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`"Hello Universe"`);

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);

    name('Multiverse');
    flush();
    // unmounted, should not update
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should render empty null', () => {
    const container = document.createElement('div');
    const unmount = render(container, null);
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });
  it('should render empty undefined', () => {
    const container = document.createElement('div');
    const unmount = render(container, undefined);
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should render empty element', () => {
    const container = document.createElement('div');
    const unmount = render(container, <div />);
    expect(prettyDOM(container)).toMatchInlineSnapshot(`"<div></div>"`);

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should render a simple element', () => {
    const container = document.createElement('div');
    const unmount = render(container, <div>Hello World</div>);
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );
    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should render a thunk element', () => {
    const container = document.createElement('div');
    const unmount = render(container, () => <div>Hello World</div>);
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should render const content', () => {
    const container = document.createElement('div');
    const name = 'World';
    const unmount = render(container, <div>Hello {name}</div>);

    debugContext();

    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });
  it('should render number/boolean/null/undefined content', () => {
    const container = document.createElement('div');
    const unmount = render(
      container,
      <div>
        zero '{0}', number '{42}', true '{true}', false '{false}', null '{null}
        ', undefined '{undefined}'
      </div>,
    );
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `"<div>zero '0', number '42', true '', false '', null '', undefined ''</div>"`,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });
  it('should render thunk content', () => {
    const container = document.createElement('div');
    const name = 'World';
    const unmount = render(container, <div>Hello {() => name}</div>);
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should render state content', () => {
    const container = document.createElement('div');
    const name = state('World');
    const unmount = render(container, <div>Hello {name}</div>);
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );

    name('Universe');
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );

    flush();
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `"<div>Hello Universe</div>"`,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should render nested elements', () => {
    const container = document.createElement('div');
    const unmount = render(
      container,
      <div>
        Hello <span>World</span>
      </div>,
    );
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `
      "<div>
        Hello
        <span>World</span>
      </div>"
    `,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });
  it('should render multiple children', () => {
    const container = document.createElement('div');
    const unmount = render(
      container,
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>,
    );
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `
      "<ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>"
    `,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });
  it('should render fragment', () => {
    const container = document.createElement('div');
    const unmount = render(
      container,
      <>
        <div>Item 1</div>
        <div>Item 2</div>
      </>,
    );
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `
      "<div>Item 1</div>
      <div>Item 2</div>"
    `,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should render nested fragments', () => {
    const container = document.createElement('div');
    const unmount = render(
      container,
      <>
        <div>Item 1</div>
        <>
          <div>Item 2</div>
          <>
            <div>Item 3</div>
          </>
        </>
      </>,
    );
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `
      "<div>Item 1</div>
      <div>Item 2</div>
      <div>Item 3</div>"
    `,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should render array children without key', () => {
    const container = document.createElement('div');
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const unmount = render(
      container,
      <ul>
        {items.map((item) => (
          <li>{item}</li>
        ))}
      </ul>,
    );
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `
      "<ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>"
    `,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should render array children with key', () => {
    const container = document.createElement('div');
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const unmount = render(
      container,
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>,
    );
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `
      "<ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>"
    `,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should render thunk array children', () => {
    const container = document.createElement('div');
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const unmount = render(
      container,
      <ul>{() => items.map((item) => <li key={item}>{item}</li>)}</ul>,
    );
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `
      "<ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>"
    `,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should render nested array children', () => {
    const container = document.createElement('div');
    const items = [
      ['Item 1.1', 'Item 1.2'],
      ['Item 2.1', 'Item 2.2'],
    ];
    const unmount = render(
      container,
      <div>
        {items.map((subItems, index) =>
          subItems.map((item) => <span key={item}>{item}</span>),
        )}
      </div>,
    );
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `
      "<div>
        <span>Item 1.1</span>
        <span>Item 1.2</span>
        <span>Item 2.1</span>
        <span>Item 2.2</span>
      </div>"
    `,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should preserve dom elements', () => {
    const container = document.createElement('div');
    const items = state(['Item 1', 'Item 2', 'Item 3']);
    const unmount = render(
      container,
      <ul>{() => items().map((item) => <li key={item}>{item}</li>)}</ul>,
    );

    // find li elements, store references, modify items, and check if li elements are preserved
    const getLiElements = () =>
      Array.from(container.querySelectorAll('li')) as HTMLLIElement[];
    let liElements = getLiElements();
    liElements.forEach((li, index) => {
      li.dataset.testId = `li-${index}`;
    });

    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `
      "<ul>
        <li data-test-id="li-0">Item 1</li>
        <li data-test-id="li-1">Item 2</li>
        <li data-test-id="li-2">Item 3</li>
      </ul>"
    `,
    );

    debugContext();

    console.log('--- re-render with same items ---');

    // re-render with same items
    items(['Item 1', 'Item 2', 'Item 3']);
    flush();

    let newLiElements = getLiElements();
    expect(newLiElements[0].dataset.testId).toBe('li-0');
    expect(newLiElements[1].dataset.testId).toBe('li-1');
    expect(newLiElements[2].dataset.testId).toBe('li-2');

    debugContext();
    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `
      "<ul>
        <li data-test-id="li-0">Item 1</li>
        <li data-test-id="li-1">Item 2</li>
        <li data-test-id="li-2">Item 3</li>
      </ul>"
    `,
    );

    console.log('--- re-render with different items ---');

    // re-render with different items
    items(['Item 2', 'Item 3', 'Item 4']);
    flush();

    debugContext();

    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `
      "<ul>
        <li data-test-id="li-1">Item 2</li>
        <li data-test-id="li-2">Item 3</li>
        <li>Item 4</li>
      </ul>"
    `,
    );

    newLiElements = getLiElements();
    expect(newLiElements[0].dataset.testId).toBe('li-1'); // Item 2 preserved
    expect(newLiElements[1].dataset.testId).toBe('li-2'); // Item 3 preserved
    expect(newLiElements[2].dataset.testId).toBeUndefined(); // Item 4 is new

    // re-render with different order

    console.log('--- re-render with reordered items ---');
    items(['Item 4', 'Item 3', 'Item 2', 'Item 5']);

    flush();

    debugContext();

    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `
      "<ul>
        <li>Item 4</li>
        <li data-test-id="li-2">Item 3</li>
        <li data-test-id="li-1">Item 2</li>
        <li>Item 5</li>
      </ul>"
    `,
    );

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should render mixed content', () => {
    const container = document.createElement('div');
    const items = state(['Item 1', 'Item 2', 'Item 3']);
    const count = state(3);
    const rerun = state(0);
    const unmount = render(container, () => (
      <div>
        <span>const</span>
        {() => <span>thunk</span>}
        count: {count}
        {() => items().map((item) => <span key={item}>{item}</span>)}
        rerun: {rerun()}
      </div>
    ));

    const spans = container.querySelectorAll('span');
    spans[0]!.dataset.testId = 'span-const';
    spans[1]!.dataset.testId = 'span-thunk';
    spans[2]!.dataset.testId = 'span-item-1';
    spans[3]!.dataset.testId = 'span-item-2';
    spans[4]!.dataset.testId = 'span-item-3';

    expect(prettyDOM(container)).toMatchInlineSnapshot(
      `
      "<div>
        <span data-test-id="span-const">const</span>
        <span data-test-id="span-thunk">thunk</span>
        count: 3
        <span data-test-id="span-item-1">Item 1</span>
        <span data-test-id="span-item-2">Item 2</span>
        <span data-test-id="span-item-3">Item 3</span>
        rerun: 0
      </div>"
    `,
    );

    debugContext();

    count(4);
    flush();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`
      "<div>
        <span data-test-id="span-const">const</span>
        <span data-test-id="span-thunk">thunk</span>
        count: 4
        <span data-test-id="span-item-1">Item 1</span>
        <span data-test-id="span-item-2">Item 2</span>
        <span data-test-id="span-item-3">Item 3</span>
        rerun: 0
      </div>"
    `);

    items(['Item 2', 'Item 1', 'Item 4']);
    flush();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`
      "<div>
        <span data-test-id="span-const">const</span>
        <span data-test-id="span-thunk">thunk</span>
        count: 4 rerun: 0
        <span data-test-id="span-item-2">Item 2</span>
        <span data-test-id="span-item-1">Item 1</span>
        <span>Item 4</span>
      </div>"
    `);

    debugContext();

    rerun(1);
    flush();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`
      "<div>
        <span data-test-id="span-const">const</span>
        <span data-test-id="span-thunk">thunk</span>
        count:
        <span data-test-id="span-item-2">Item 2</span>
        <span data-test-id="span-item-1">Item 1</span>
        <span>Item 4</span>
        4 rerun: 1
      </div>"
    `);

    debugContext();

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should handle swapping elements in thunks', () => {
    const container = document.createElement('div');
    const swap = state(false);
    const unmount = render(container, () => (
      <div>
        {() =>
          swap()
            ? [<span key="b">B</span>, <span key="a">A</span>]
            : [<span key="a">A</span>, <span key="b">B</span>]
        }
      </div>
    ));

    debugContext();
    const spans = container.querySelectorAll('span');
    spans[0]!.dataset.testId = 'span-1';
    spans[1]!.dataset.testId = 'span-2';

    expect(prettyDOM(container)).toMatchInlineSnapshot(`"<div></div>"`);

    swap(true);
    flush();

    debugContext();

    expect(prettyDOM(container)).toMatchInlineSnapshot(`"<div></div>"`);

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });

  it('should handle swapping elements between thunks', () => {
    const container = document.createElement('div');
    const swap = state(false);
    const unmount = render(container, () => (
      <div>
        {() => (swap() ? <span key="b">B</span> : <span key="a">A</span>)}
        {() => (swap() ? <span key="a">A</span> : <span key="b">B</span>)}
      </div>
    ));

    debugContext();
    const spans = container.querySelectorAll('span');
    spans[0]!.dataset.testId = 'span-1';
    spans[1]!.dataset.testId = 'span-2';

    expect(prettyDOM(container)).toMatchInlineSnapshot(`"<div></div>"`);

    swap(true);
    flush();

    debugContext();

    expect(prettyDOM(container)).toMatchInlineSnapshot(`"<div></div>"`);

    unmount();
    expect(prettyDOM(container)).toMatchInlineSnapshot(`""`);
  });
});
