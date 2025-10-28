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
});
