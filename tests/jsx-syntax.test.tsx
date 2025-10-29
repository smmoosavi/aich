import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Fragment, isValidElement, cloneElement } from '../src/jsx-runtime.js';

describe('JSX Syntax (TSX)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Basic JSX Elements', () => {
    it('should render a simple div element', () => {
      const element = <div className="test">Hello JSX</div>;

      expect(element).toMatchObject({
        type: 'div',
        props: {
          className: 'test',
          children: 'Hello JSX',
        },
      });

      // expect(consoleLogSpy).toHaveBeenCalledWith(
      //   expect.stringContaining('called'),
      //   expect.any(Object),
      // );
    });

    it('should render self-closing elements', () => {
      const element = <input type="text" placeholder="Enter text" />;

      expect(element.type).toBe('input');
      expect(element.props.type).toBe('text');
      expect(element.props.placeholder).toBe('Enter text');
    });

    it('should handle nested elements', () => {
      const element = (
        <div className="container">
          <h1>Title</h1>
          <p>Paragraph</p>
        </div>
      );

      expect(element.type).toBe('div');
      expect(element.props.className).toBe('container');
      expect(Array.isArray(element.props.children)).toBe(true);
    });

    it('should handle elements with multiple children', () => {
      const element = (
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      );

      expect(element.type).toBe('ul');
      expect(Array.isArray(element.props.children)).toBe(true);
      expect(element.props.children).toHaveLength(3);
    });
  });

  describe('Fragment', () => {
    it('should render Fragment with shorthand syntax', () => {
      const element = (
        <>
          <div>First</div>
          <div>Second</div>
        </>
      );

      expect(element.type).toBe(Fragment);
      expect(Array.isArray(element.props.children)).toBe(true);
      expect(element.props.children).toHaveLength(2);
    });

    it('should render Fragment with explicit syntax', () => {
      const element = (
        <Fragment>
          <span>One</span>
          <span>Two</span>
        </Fragment>
      );

      expect(element.type).toBe(Fragment);
      expect(element.props.children).toHaveLength(2);
    });

    it('should handle Fragment with single child', () => {
      const element = (
        <>
          <div>Only child</div>
        </>
      );

      expect(element.type).toBe(Fragment);
      expect(element.props.children).toBeDefined();
    });
  });

  describe('Props and Attributes', () => {
    it('should handle boolean attributes', () => {
      const element = <input type="checkbox" checked disabled />;

      expect(element.props.checked).toBe(true);
      expect(element.props.disabled).toBe(true);
    });

    it('should handle event handlers', () => {
      const handleClick = vi.fn();
      const element = <button onClick={handleClick}>Click me</button>;

      expect(element.props.onClick).toBe(handleClick);
    });

    it('should handle data attributes', () => {
      const element = <div data-testid="my-component" data-value={42} />;

      expect(element.props['data-testid']).toBe('my-component');
      expect(element.props['data-value']).toBe(42);
    });

    it('should handle style prop', () => {
      const element = <div style={{ color: 'red', fontSize: '16px' }} />;

      expect(element.props.style).toEqual({
        color: 'red',
        fontSize: '16px',
      });
    });

    it('should handle className vs class', () => {
      const element = <div className="my-class" />;

      expect(element.props.className).toBe('my-class');
    });
  });

  describe('Keys', () => {
    it('should handle key prop', () => {
      const element = <div key="unique-key">Content</div>;

      expect(element.key).toBe('unique-key');
    });

    it('should handle numeric keys', () => {
      const items = [1, 2, 3].map((num) => <li key={num}>Item {num}</li>);

      expect(items[0].key).toBe(1);
      expect(items[1].key).toBe(2);
      expect(items[2].key).toBe(3);
    });

    it('should render list with keys', () => {
      const items = ['a', 'b', 'c'];
      const list = (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );

      expect(list.type).toBe('ul');
      expect(Array.isArray(list.props.children)).toBe(true);
    });
  });

  describe('Components', () => {
    it('should render function components', () => {
      const Greeting = ({ name }: { name: string }) => {
        return <h1>Hello, {name}!</h1>;
      };

      const element = <Greeting name="World" />;

      expect(element.type).toBe(Greeting);
      expect(element.props.name).toBe('World');
    });

    it('should render components with children', () => {
      const Container = ({ children }: { children?: any }) => {
        return <div className="container">{children}</div>;
      };

      const element = (
        <Container>
          <p>Child content</p>
        </Container>
      );

      expect(element.type).toBe(Container);
      expect(element.props.children).toBeDefined();
    });

    it('should handle components with multiple props', () => {
      interface ButtonProps {
        label: string;
        variant: 'primary' | 'secondary';
        disabled?: boolean;
        onClick?: () => void;
      }

      const Button = ({ label, variant, disabled, onClick }: ButtonProps) => {
        return (
          <button className={variant} disabled={disabled} onClick={onClick}>
            {label}
          </button>
        );
      };

      const handleClick = vi.fn();
      const element = (
        <Button label="Submit" variant="primary" onClick={handleClick} />
      );

      expect(element.type).toBe(Button);
      expect(element.props.label).toBe('Submit');
      expect(element.props.variant).toBe('primary');
      expect(element.props.onClick).toBe(handleClick);
    });

    it('should handle nested components', () => {
      const Card = ({ children }: { children?: any }) => (
        <div className="card">{children}</div>
      );

      const CardHeader = ({ title }: { title: string }) => <h2>{title}</h2>;

      const CardBody = ({ children }: { children?: any }) => (
        <div className="body">{children}</div>
      );

      const element = (
        <Card>
          <CardHeader title="My Card" />
          <CardBody>
            <p>Card content</p>
          </CardBody>
        </Card>
      );

      expect(element.type).toBe(Card);
      expect(Array.isArray(element.props.children)).toBe(true);
    });
  });

  describe('Expressions in JSX', () => {
    it('should handle string expressions', () => {
      const name = 'React';
      const element = <div>Hello {name}</div>;

      expect(element.props.children).toContain('Hello ');
      expect(element.props.children).toContain(name);
    });

    it('should handle numeric expressions', () => {
      const count = 42;
      const element = <span>Count: {count}</span>;

      expect(element.props.children).toContain('Count: ');
      expect(element.props.children).toContain(42);
    });

    it('should handle boolean expressions (falsy values)', () => {
      const show = false;
      const element = <div>{show && <span>Hidden</span>}</div>;

      // false is a valid child but won't render
      expect(element.props.children).toBe(false);
    });

    it('should handle conditional rendering', () => {
      const isLoggedIn = true;
      const element = (
        <div>{isLoggedIn ? <span>Welcome</span> : <span>Login</span>}</div>
      );

      expect(element.props.children).toBeDefined();
    });

    it('should handle array mapping', () => {
      const numbers = [1, 2, 3];
      const element = (
        <ul>
          {numbers.map((n) => (
            <li key={n}>{n * 2}</li>
          ))}
        </ul>
      );

      expect(element.type).toBe('ul');
      expect(Array.isArray(element.props.children)).toBe(true);
    });
  });

  describe('Utility Functions with JSX', () => {
    it('should validate JSX elements with isValidElement', () => {
      const element = <div>Test</div>;

      consoleLogSpy.mockClear();
      const result = isValidElement(element);

      expect(result).toBe(true);
    });

    it('should clone JSX elements with cloneElement', () => {
      const original = <div className="original">Content</div>;

      consoleLogSpy.mockClear();
      const cloned = cloneElement(original, { className: 'cloned' });

      expect(cloned.props.className).toBe('cloned');
      expect(cloned.props.children).toBe('Content');
    });

    it('should clone with additional children', () => {
      const original = <div>Original</div>;
      const cloned = cloneElement(original, {}, 'New child');

      expect(cloned.props.children).toBe('New child');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null children', () => {
      const element = <div>{null}</div>;

      expect(element.props.children).toBe(null);
    });

    it('should handle undefined children', () => {
      const element = <div>{undefined}</div>;

      expect(element.props.children).toBe(undefined);
    });

    it('should handle empty string', () => {
      const element = <div>{''}</div>;

      expect(element.props.children).toBe('');
    });

    it('should handle zero', () => {
      const element = <div>{0}</div>;

      expect(element.props.children).toBe(0);
    });

    it('should handle mixed content types', () => {
      const element = (
        <div>
          Text {42} <span>Element</span> {true} {null}
        </div>
      );

      expect(element.props.children).toBeDefined();
      expect(Array.isArray(element.props.children)).toBe(true);
    });
  });

  describe('Special HTML Elements', () => {
    it('should handle img elements', () => {
      const element = <img src="/path/to/image.jpg" alt="Description" />;

      expect(element.type).toBe('img');
      expect(element.props.src).toBe('/path/to/image.jpg');
      expect(element.props.alt).toBe('Description');
    });

    it('should handle form elements', () => {
      const element = (
        <form>
          <input type="text" name="username" />
          <textarea name="message" />
          <select name="country">
            <option value="us">USA</option>
            <option value="uk">UK</option>
          </select>
        </form>
      );

      expect(element.type).toBe('form');
      expect(element.props.children).toHaveLength(3);
    });

    it('should handle svg elements', () => {
      const element = (
        <svg width="100" height="100">
          <circle cx="50" cy="50" r="40" fill="red" />
        </svg>
      );

      expect(element.type).toBe('svg');
      expect(element.props.width).toBe('100');
    });
  });
});
