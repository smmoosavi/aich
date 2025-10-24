import { DOMRenderer } from '../src/dom-renderer';

describe('DOMRenderer', () => {
  describe('createElement', () => {
    test('creates an element with the specified tag', () => {
      const element = DOMRenderer.createElement('div');
      expect(element.tagName).toBe('DIV');
      expect(element).toMatchInlineSnapshot(`
        <div />
      `);
    });

    test('creates different element types', () => {
      const div = DOMRenderer.createElement('div');
      const span = DOMRenderer.createElement('span');
      const button = DOMRenderer.createElement('button');

      expect(div.tagName).toBe('DIV');
      expect(span.tagName).toBe('SPAN');
      expect(button.tagName).toBe('BUTTON');
    });
  });

  describe('createTextNode', () => {
    test('creates a text node with the specified text', () => {
      const textNode = DOMRenderer.createTextNode('Hello World');
      expect(textNode.nodeType).toBe(Node.TEXT_NODE);
      expect(textNode.textContent).toBe('Hello World');
    });

    test('creates empty text node', () => {
      const textNode = DOMRenderer.createTextNode('');
      expect(textNode.textContent).toBe('');
    });
  });

  describe('createComment', () => {
    test('creates a comment node with the specified text', () => {
      const comment = DOMRenderer.createComment('This is a comment');
      expect(comment.nodeType).toBe(Node.COMMENT_NODE);
      expect(comment.textContent).toBe('This is a comment');
    });
  });

  describe('appendChild', () => {
    test('appends a child element to a parent', () => {
      const parent = DOMRenderer.createElement('div');
      const child = DOMRenderer.createElement('span');

      DOMRenderer.appendChild(parent, child);

      expect(parent.children.length).toBe(1);
      expect(parent.children[0]).toBe(child);
      expect(parent).toMatchInlineSnapshot(`
        <div>
          <span />
        </div>
      `);
    });

    test('appends multiple children', () => {
      const parent = DOMRenderer.createElement('div');
      const child1 = DOMRenderer.createElement('span');
      const child2 = DOMRenderer.createElement('p');

      DOMRenderer.appendChild(parent, child1);
      DOMRenderer.appendChild(parent, child2);

      expect(parent.children.length).toBe(2);
      expect(parent.children[0]).toBe(child1);
      expect(parent.children[1]).toBe(child2);
    });

    test('appends text node', () => {
      const parent = DOMRenderer.createElement('div');
      const textNode = DOMRenderer.createTextNode('Hello');

      DOMRenderer.appendChild(parent, textNode);

      expect(parent.textContent).toBe('Hello');
      expect(parent).toMatchInlineSnapshot(`
        <div>
          Hello
        </div>
      `);
    });
  });

  describe('insertBefore', () => {
    test('inserts a node before a reference node', () => {
      const parent = DOMRenderer.createElement('div');
      const child1 = DOMRenderer.createElement('span');
      const child2 = DOMRenderer.createElement('p');
      const newChild = DOMRenderer.createElement('h1');

      DOMRenderer.appendChild(parent, child1);
      DOMRenderer.appendChild(parent, child2);
      DOMRenderer.insertBefore(parent, newChild, child2);

      expect(parent.children.length).toBe(3);
      expect(parent.children[0]).toBe(child1);
      expect(parent.children[1]).toBe(newChild);
      expect(parent.children[2]).toBe(child2);
      expect(parent).toMatchInlineSnapshot(`
        <div>
          <span />
          <h1 />
          <p />
        </div>
      `);
    });

    test('inserts at the beginning when ref is first child', () => {
      const parent = DOMRenderer.createElement('div');
      const child1 = DOMRenderer.createElement('span');
      const child2 = DOMRenderer.createElement('p');
      const newChild = DOMRenderer.createElement('h1');

      DOMRenderer.appendChild(parent, child1);
      DOMRenderer.appendChild(parent, child2);
      DOMRenderer.insertBefore(parent, newChild, child1);

      expect(parent.children[0]).toBe(newChild);
      expect(parent.children[1]).toBe(child1);
      expect(parent.children[2]).toBe(child2);
    });

    test('inserts at the end when ref is null', () => {
      const parent = DOMRenderer.createElement('div');
      const child1 = DOMRenderer.createElement('span');
      const newChild = DOMRenderer.createElement('p');

      DOMRenderer.appendChild(parent, child1);
      DOMRenderer.insertBefore(parent, newChild, null);

      expect(parent.children.length).toBe(2);
      expect(parent.children[0]).toBe(child1);
      expect(parent.children[1]).toBe(newChild);
    });
  });

  describe('replaceChild', () => {
    test('replaces a child node with a new node', () => {
      const parent = DOMRenderer.createElement('div');
      const oldChild = DOMRenderer.createElement('span');
      const newChild = DOMRenderer.createElement('p');

      DOMRenderer.appendChild(parent, oldChild);
      DOMRenderer.replaceChild(parent, newChild, oldChild);

      expect(parent.children.length).toBe(1);
      expect(parent.children[0]).toBe(newChild);
      expect(parent.contains(oldChild)).toBe(false);
      expect(parent).toMatchInlineSnapshot(`
        <div>
          <p />
        </div>
      `);
    });
  });

  describe('removeChild', () => {
    test('removes a child node from parent', () => {
      const parent = DOMRenderer.createElement('div');
      const child1 = DOMRenderer.createElement('span');
      const child2 = DOMRenderer.createElement('p');

      DOMRenderer.appendChild(parent, child1);
      DOMRenderer.appendChild(parent, child2);
      DOMRenderer.removeChild(parent, child1);

      expect(parent.children.length).toBe(1);
      expect(parent.children[0]).toBe(child2);
      expect(parent.contains(child1)).toBe(false);
      expect(parent).toMatchInlineSnapshot(`
        <div>
          <p />
        </div>
      `);
    });
  });

  describe('setTextContent', () => {
    test('sets text content on an element', () => {
      const element = DOMRenderer.createElement('div');
      DOMRenderer.setTextContent(element, 'Hello World');

      expect(element.textContent).toBe('Hello World');
      expect(element).toMatchInlineSnapshot(`
        <div>
          Hello World
        </div>
      `);
    });

    test('overwrites existing text content', () => {
      const element = DOMRenderer.createElement('div');
      DOMRenderer.setTextContent(element, 'First');
      DOMRenderer.setTextContent(element, 'Second');

      expect(element.textContent).toBe('Second');
    });

    test('sets empty text content', () => {
      const element = DOMRenderer.createElement('div');
      DOMRenderer.setTextContent(element, 'Hello');
      DOMRenderer.setTextContent(element, '');

      expect(element.textContent).toBe('');
    });
  });

  describe('setAttribute', () => {
    test('sets an attribute on an element', () => {
      const element = DOMRenderer.createElement('input');
      DOMRenderer.setAttribute(element, 'type', 'text');

      expect(element.getAttribute('type')).toBe('text');
      expect(element).toMatchInlineSnapshot(`
        <input
          type="text"
        />
      `);
    });

    test('sets multiple attributes', () => {
      const element = DOMRenderer.createElement('input');
      DOMRenderer.setAttribute(element, 'type', 'email');
      DOMRenderer.setAttribute(element, 'placeholder', 'Enter email');

      expect(element.getAttribute('type')).toBe('email');
      expect(element.getAttribute('placeholder')).toBe('Enter email');
    });

    test('overwrites existing attribute', () => {
      const element = DOMRenderer.createElement('input');
      DOMRenderer.setAttribute(element, 'type', 'text');
      DOMRenderer.setAttribute(element, 'type', 'password');

      expect(element.getAttribute('type')).toBe('password');
    });
  });

  describe('removeAttribute', () => {
    test('removes an attribute from an element', () => {
      const element = DOMRenderer.createElement('input');
      DOMRenderer.setAttribute(element, 'type', 'text');
      DOMRenderer.removeAttribute(element, 'type');

      expect(element.hasAttribute('type')).toBe(false);
      expect(element).toMatchInlineSnapshot(`
        <input />
      `);
    });

    test('does nothing if attribute does not exist', () => {
      const element = DOMRenderer.createElement('div');
      DOMRenderer.removeAttribute(element, 'nonexistent');

      expect(element.hasAttribute('nonexistent')).toBe(false);
    });
  });

  describe('addEventListener and removeEventListener', () => {
    test('adds and removes event listeners', () => {
      const element = DOMRenderer.createElement('button');
      const mockListener = vi.fn();

      DOMRenderer.addEventListener(element, 'click', mockListener);
      element.click();
      expect(mockListener).toHaveBeenCalledTimes(1);

      DOMRenderer.removeEventListener(element, 'click', mockListener);
      element.click();
      expect(mockListener).toHaveBeenCalledTimes(1); // Should not be called again
    });

    test('handles multiple event listeners', () => {
      const element = DOMRenderer.createElement('button');
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      DOMRenderer.addEventListener(element, 'click', listener1);
      DOMRenderer.addEventListener(element, 'click', listener2);

      element.click();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration tests', () => {
    test('builds a complete DOM structure', () => {
      // Create root element
      const root = DOMRenderer.createElement('div');
      DOMRenderer.setAttribute(root, 'id', 'root');

      // Create header
      const header = DOMRenderer.createElement('h1');
      const headerText = DOMRenderer.createTextNode('Welcome');
      DOMRenderer.appendChild(header, headerText);
      DOMRenderer.appendChild(root, header);

      // Create content
      const content = DOMRenderer.createElement('div');
      DOMRenderer.setAttribute(content, 'class', 'content');

      const paragraph = DOMRenderer.createElement('p');
      const paraText = DOMRenderer.createTextNode('This is a test paragraph.');
      DOMRenderer.appendChild(paragraph, paraText);
      DOMRenderer.appendChild(content, paragraph);

      DOMRenderer.appendChild(root, content);

      // Create button
      const button = DOMRenderer.createElement('button');
      DOMRenderer.setAttribute(button, 'type', 'button');
      const buttonText = DOMRenderer.createTextNode('Click me');
      DOMRenderer.appendChild(button, buttonText);
      DOMRenderer.appendChild(root, button);

      expect(root).toMatchInlineSnapshot(`
        <div
          id="root"
        >
          <h1>
            Welcome
          </h1>
          <div
            class="content"
          >
            <p>
              This is a test paragraph.
            </p>
          </div>
          <button
            type="button"
          >
            Click me
          </button>
        </div>
      `);
    });

    test('manipulates DOM tree dynamically', () => {
      const container = DOMRenderer.createElement('div');

      // Add initial items
      const item1 = DOMRenderer.createElement('li');
      DOMRenderer.setTextContent(item1, 'Item 1');
      DOMRenderer.appendChild(container, item1);

      const item2 = DOMRenderer.createElement('li');
      DOMRenderer.setTextContent(item2, 'Item 2');
      DOMRenderer.appendChild(container, item2);

      // Insert new item at beginning
      const newItem = DOMRenderer.createElement('li');
      DOMRenderer.setTextContent(newItem, 'New Item');
      DOMRenderer.insertBefore(container, newItem, item1);

      // Replace second item
      const replacedItem = DOMRenderer.createElement('li');
      DOMRenderer.setTextContent(replacedItem, 'Replaced Item');
      DOMRenderer.replaceChild(container, replacedItem, item2);

      // Remove first item
      DOMRenderer.removeChild(container, newItem);

      expect(container).toMatchInlineSnapshot(`
        <div>
          <li>
            Item 1
          </li>
          <li>
            Replaced Item
          </li>
        </div>
      `);
    });
  });
});
