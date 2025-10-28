import { flush, state } from '../src';
import { render } from '../src/dom';
describe('render', () => {
  it('should render text node', () => {
    const container = document.createElement('div');
    const unmount = render(container, 'Hello World');
    expect(container.innerHTML).toMatchInlineSnapshot(`"Hello World"`);

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });
  it('should render thunk text node', () => {
    const container = document.createElement('div');
    const unmount = render(container, () => 'Hello World');
    expect(container.innerHTML).toMatchInlineSnapshot(`"Hello World"`);

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });
  it('should render state text node', () => {
    const container = document.createElement('div');
    const name = state('World');
    const unmount = render(container, () => `Hello ${name()}`);
    expect(container.innerHTML).toMatchInlineSnapshot(`"Hello World"`);

    name('Universe');
    expect(container.innerHTML).toMatchInlineSnapshot(`"Hello World"`);

    flush();
    expect(container.innerHTML).toMatchInlineSnapshot(`"Hello Universe"`);

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);

    name('Multiverse');
    flush();
    // unmounted, should not update
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });

  it('should render empty null', () => {
    const container = document.createElement('div');
    const unmount = render(container, null);
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });
  it('should render empty undefined', () => {
    const container = document.createElement('div');
    const unmount = render(container, undefined);
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });

  it('should render empty element', () => {
    const container = document.createElement('div');
    const unmount = render(container, <div />);
    expect(container.innerHTML).toMatchInlineSnapshot(`"<div></div>"`);

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });

  it('should render a simple element', () => {
    const container = document.createElement('div');
    const unmount = render(container, <div>Hello World</div>);
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );
    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });

  it('should render a thunk element', () => {
    const container = document.createElement('div');
    const unmount = render(container, () => <div>Hello World</div>);
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });

  it('should render const content', () => {
    const container = document.createElement('div');
    const name = 'World';
    const unmount = render(container, <div>Hello {name}</div>);
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
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
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>zero '0', number '42', true '', false '', null '', undefined ''</div>"`,
    );

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });
  it('should render thunk content', () => {
    const container = document.createElement('div');
    const name = 'World';
    const unmount = render(container, <div>Hello {() => name}</div>);
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });

  it('should render state content', () => {
    const container = document.createElement('div');
    const name = state('World');
    const unmount = render(container, <div>Hello {name}</div>);
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );

    name('Universe');
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );

    flush();
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Hello Universe</div>"`,
    );

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });

  it('should render nested elements', () => {
    const container = document.createElement('div');
    const unmount = render(
      container,
      <div>
        Hello <span>World</span>
      </div>,
    );
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Hello <span>World</span></div>"`,
    );

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
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
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>"`,
    );

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
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
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Item 1</div><div>Item 2</div>"`,
    );

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
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
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Item 1</div><div>Item 2</div><div>Item 3</div>"`,
    );

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
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
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>"`,
    );

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
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
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>"`,
    );

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });

  it('should render thunk array children', () => {
    const container = document.createElement('div');
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const unmount = render(
      container,
      <ul>{() => items.map((item) => <li key={item}>{item}</li>)}</ul>,
    );
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>"`,
    );

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
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
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div><span>Item 1.1</span><span>Item 1.2</span><span>Item 2.1</span><span>Item 2.2</span></div>"`,
    );

    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });

  it.only('should preserve dom elements', () => {
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

    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<ul><li data-test-id="li-0">Item 1</li><li data-test-id="li-1">Item 2</li><li data-test-id="li-2">Item 3</li></ul>"`,
    );

    console.log('--- re-render with same items ---');

    // re-render with same items
    items(['Item 1', 'Item 2', 'Item 3']);
    flush();

    let newLiElements = getLiElements();
    expect(newLiElements[0].dataset.testId).toBe('li-0');
    expect(newLiElements[1].dataset.testId).toBe('li-1');
    expect(newLiElements[2].dataset.testId).toBe('li-2');

    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<ul><li data-test-id="li-0">Item 1</li><li data-test-id="li-1">Item 2</li><li data-test-id="li-2">Item 3</li></ul>"`,
    );


    console.log('--- re-render with different items ---');

    // re-render with different items
    items(['Item 2', 'Item 3', 'Item 4']);
    flush();

    newLiElements = getLiElements();
    expect(newLiElements[0].dataset.testId).toBe('li-1'); // Item 2 preserved
    expect(newLiElements[1].dataset.testId).toBe('li-2'); // Item 3 preserved
    expect(newLiElements[2].dataset.testId).toBeUndefined(); // Item 4 is new

    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<ul><li data-test-id="li-1">Item 2</li><li data-test-id="li-2">Item 3</li><li>Item 4</li></ul>"`,
    );


    unmount();
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });
});
