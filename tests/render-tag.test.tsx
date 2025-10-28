import { flush, state } from '../src';
import { render } from '../src/dom';
describe('render', () => {
  describe('render element', () => {
    it('should render a simple element', () => {
      const container = document.createElement('div');
      render(container, <div>Hello World</div>);
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
      render(container, <div>Hello <><span>World</span></></div>);
      expect(container.innerHTML).toMatchInlineSnapshot(
        `"<div>Hello <span>World</span></div>"`,
      );
    });
  
});
