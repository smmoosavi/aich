import { flush, state } from '../src';
import { render } from '../src/dom';
describe('render', () => {
  it('should render text node', () => {
    const container = document.createElement('div');
    render(container, 'Hello World');
    expect(container.innerHTML).toMatchInlineSnapshot(`"Hello World"`);
  });
  it('should render thunk text node', () => {
    const container = document.createElement('div');
    render(container, () => 'Hello World');
    expect(container.innerHTML).toMatchInlineSnapshot(`"Hello World"`);
  });
  it('should render state text node', () => {
    const container = document.createElement('div');
    const name = state('World');
    render(container, () => `Hello ${name()}`);
    expect(container.innerHTML).toMatchInlineSnapshot(`"Hello World"`);

    name('Universe');
    expect(container.innerHTML).toMatchInlineSnapshot(`"Hello World"`);

    flush();
    expect(container.innerHTML).toMatchInlineSnapshot(`"Hello Universe"`);
  });

  it('should render empty content', () => {
    const container = document.createElement('div');
    render(container, null);
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);

    render(container, undefined);
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });

  it('should render empty element', () => {
    const container = document.createElement('div');
    render(container, <div />);
    expect(container.innerHTML).toMatchInlineSnapshot(`"<div></div>"`);
  });

  it('should render a simple element', () => {
    const container = document.createElement('div');
    render(container, <div>Hello World</div>);
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );
  });

  it('should render a thunk element', () => {
    const container = document.createElement('div');
    render(container, () => <div>Hello World</div>);
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );
  });

  it('should render const content', () => {
    const container = document.createElement('div');
    const name = 'World';
    render(container, <div>Hello {name}</div>);
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );
  });
  it('should render number/boolean/null/undefined content', () => {
    const container = document.createElement('div');
    render(
      container,
      <div>
        zero '{0}', number '{42}', true '{true}', false '{false}', null '{null}
        ', undefined '{undefined}'
      </div>,
    );
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>zero '0', number '42', true '', false '', null '', undefined ''</div>"`,
    );
  });
  it('should render thunk content', () => {
    const container = document.createElement('div');
    const name = 'World';
    render(container, <div>Hello {() => name}</div>);
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div>Hello World</div>"`,
    );
  });

  it('should render state content', () => {
    const container = document.createElement('div');
    const name = state('World');
    render(container, <div>Hello {name}</div>);
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
  });
});

it('should render nested elements', () => {
  const container = document.createElement('div');
  render(
    container,
    <div>
      Hello <span>World</span>
    </div>,
  );
  expect(container.innerHTML).toMatchInlineSnapshot(
    `"<div>Hello <span>World</span></div>"`,
  );
});
it('should render multiple children', () => {
  const container = document.createElement('div');
  render(
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
});
