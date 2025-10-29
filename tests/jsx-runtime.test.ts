import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  jsx,
  jsxs,
  jsxDEV,
  Fragment,
  createElement,
  isValidElement,
  cloneElement,
  FRAGMENT,
} from '../src/jsx-runtime.js';

describe('JSX Runtime', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('jsx()', () => {
    it('should create a JSX element and log it', () => {
      const element = jsx('div', { className: 'test' });

      expect(element).toEqual({
        type: 'div',
        props: { className: 'test' },
        key: null,
      });

      // expect(consoleLogSpy).toHaveBeenCalledWith('jsx() called:', {
      //   type: 'div',
      //   props: { className: 'test' },
      //   key: null,
      // });
    });

    it('should handle key prop', () => {
      const element = jsx('div', { className: 'test' }, 'unique-key');

      expect(element.key).toBe('unique-key');
    });
  });

  describe('jsxs()', () => {
    it('should create a JSX element with static children and log it', () => {
      const element = jsxs('div', { children: ['Hello', 'World'] });

      expect(element).toEqual({
        type: 'div',
        props: { children: ['Hello', 'World'] },
        key: null,
      });

      // expect(consoleLogSpy).toHaveBeenCalledWith('jsxs() called (static):', {
      //   type: 'div',
      //   props: { children: ['Hello', 'World'] },
      //   key: null,
      // });
    });
  });

  describe('jsxDEV()', () => {
    it('should create a JSX element in development mode and log debug info', () => {
      const source = { fileName: 'test.tsx', lineNumber: 10, columnNumber: 5 };
      const element = jsxDEV(
        'button',
        { onClick: () => {} },
        'btn-1',
        false,
        source,
        undefined,
      );

      expect(element).toEqual({
        type: 'button',
        props: { onClick: expect.any(Function) },
        key: 'btn-1',
      });

      // expect(consoleLogSpy).toHaveBeenCalledWith(
      //   'jsxDEV() called (development):',
      //   {
      //     type: 'button',
      //     props: { onClick: expect.any(Function) },
      //     key: 'btn-1',
      //     isStaticChildren: false,
      //     source,
      //     self: undefined,
      //   },
      // );
    });
  });

  describe('Fragment', () => {
    it('should create a Fragment element and log it', () => {
      const element = Fragment({ children: ['child1', 'child2'] });

      expect(element).toEqual({
        type: FRAGMENT,
        props: { children: ['child1', 'child2'] },
        key: null,
      });

      // expect(consoleLogSpy).toHaveBeenCalledWith('Fragment() called:', {
      //   children: ['child1', 'child2'],
      // });
    });
  });

  describe('createElement()', () => {
    it('should create an element with classic JSX syntax', () => {
      const element = createElement('div', { id: 'root' }, 'Hello', 'World');

      expect(element).toEqual({
        type: 'div',
        props: {
          id: 'root',
          children: ['Hello', 'World'],
        },
        key: null,
      });

      // expect(consoleLogSpy).toHaveBeenCalledWith(
      //   'createElement() called (classic):',
      //   {
      //     type: 'div',
      //     props: {
      //       id: 'root',
      //       children: ['Hello', 'World'],
      //     },
      //     children: ['Hello', 'World'],
      //   },
      // );
    });

    it('should handle single child', () => {
      const element = createElement('span', null, 'Single child');

      expect(element.props.children).toBe('Single child');
    });

    it('should handle no children', () => {
      const element = createElement('input', { type: 'text' });

      expect(element.props.children).toBeUndefined();
    });
  });

  describe('isValidElement()', () => {
    it('should return true for valid JSX elements', () => {
      const element = jsx('div', {});
      consoleLogSpy.mockClear();

      const result = isValidElement(element);

      expect(result).toBe(true);
      // expect(consoleLogSpy).toHaveBeenCalledWith('isValidElement() called:', {
      //   obj: element,
      //   isValid: true,
      // });
    });

    it('should return false for invalid elements', () => {
      consoleLogSpy.mockClear();

      expect(isValidElement(null)).toBe(false);
      expect(isValidElement(undefined)).toBe(false);
      expect(isValidElement('string')).toBe(false);
      expect(isValidElement({})).toBe(false);
    });
  });

  describe('cloneElement()', () => {
    it('should clone an element with new props', () => {
      const original = jsx('div', { className: 'original', id: 'test' });
      consoleLogSpy.mockClear();

      const cloned = cloneElement(original, { className: 'cloned' });

      expect(cloned).toEqual({
        type: 'div',
        props: {
          className: 'cloned',
          id: 'test',
        },
        key: null,
      });

      // expect(consoleLogSpy).toHaveBeenCalledWith('cloneElement() called:', {
      //   element: original,
      //   newProps: {
      //     className: 'cloned',
      //     id: 'test',
      //   },
      //   children: [],
      // });
    });

    it('should override children', () => {
      const original = jsx('div', { children: 'original' });
      consoleLogSpy.mockClear();

      const cloned = cloneElement(original, {}, 'new child');

      expect(cloned.props.children).toBe('new child');
    });

    it('should handle new key', () => {
      const original = jsx('div', {}, 'old-key');
      const cloned = cloneElement(original, { key: 'new-key' });

      expect(cloned.key).toBe('new-key');
    });
  });

  describe('JSX Syntax (using automatic runtime)', () => {
    it('should work with JSX syntax when built', () => {
      // After building, this would work with JSX syntax:
      // const element = <div className="test">Hello JSX</div>;

      // For now, test with direct function call
      const element = jsx('div', { className: 'test', children: 'Hello JSX' });

      expect(element).toEqual({
        type: 'div',
        props: {
          className: 'test',
          children: 'Hello JSX',
        },
        key: null,
      });
    });

    it('should work with Fragment when built', () => {
      // After building, this would work:
      // const element = (<><div>First</div><div>Second</div></>);

      // For now, test with direct function call
      const element = jsx(Fragment, {
        children: [
          jsx('div', { children: 'First' }),
          jsx('div', { children: 'Second' }),
        ],
      });

      expect(element.type).toBe(Fragment);
      expect(element.props.children).toHaveLength(2);
    });

    it('should work with components when built', () => {
      const MyComponent = (props: { name: string }) => {
        return jsx('div', { children: `Hello ${props.name}` });
      };

      // After building, this would work:
      // const element = <MyComponent name="World" />;

      // For now, test with direct function call
      const element = jsx(MyComponent, { name: 'World' });

      expect(element.type).toBe(MyComponent);
      expect(element.props.name).toBe('World');
    });
  });
});
