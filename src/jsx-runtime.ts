// JSX Element Type
export interface JSXElement {
  type: string | Function;
  props: Record<string, any>;
  key: string | number | null;
}

// Props with children and key
export type JSXChild =
  | JSXElement
  | string
  | number
  | boolean
  | null
  | undefined;

export interface JSXProps {
  children?: JSXChild | JSXChild[];
  key?: string | number | null;
  [prop: string]: any;
}

// Global JSX namespace for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }

    type Element = JSXElement;

    interface ElementChildrenAttribute {
      children: {};
    }

    interface IntrinsicAttributes {
      key?: string | number | null;
    }
  }
}

/**
 * JSX Factory Function (automatic runtime)
 * Used by JSX transform for elements
 */
export function jsx(
  type: string | Function,
  props: JSXProps,
  key?: string | number | null,
): JSXElement {
  console.log('jsx() called:', {
    type,
    props,
    key: key ?? null,
  });

  return {
    type,
    props: props || {},
    key: key ?? null,
  };
}

/**
 * JSX Factory Function for static children (automatic runtime)
 * Used by JSX transform for elements with static children
 */
export function jsxs(
  type: string | Function,
  props: JSXProps,
  key?: string | number | null,
): JSXElement {
  console.log('jsxs() called (static):', {
    type,
    props,
    key: key ?? null,
  });

  return {
    type,
    props: props || {},
    key: key ?? null,
  };
}

/**
 * JSX Development Runtime
 * Used in development mode with additional debug info
 */
export function jsxDEV(
  type: string | Function,
  props: JSXProps,
  key?: string | number | null,
  isStaticChildren?: boolean,
  source?: { fileName: string; lineNumber: number; columnNumber: number },
  self?: any,
): JSXElement {
  console.log('jsxDEV() called (development):', {
    type,
    props,
    key: key ?? null,
    isStaticChildren,
    source,
    // self,
  });

  return {
    type,
    props: props || {},
    key: key ?? null,
  };
}

/**
 * Fragment Component
 * Used for grouping elements without a wrapper
 */
export function Fragment(props: { children?: any }): JSXElement {
  console.log('Fragment() called:', props);

  return {
    type: Fragment,
    props: props || {},
    key: null,
  };
}

/**
 * Classic JSX Factory (for backward compatibility)
 * Used with @jsx pragma
 */
export function createElement(
  type: string | Function,
  props: JSXProps | null,
  ...children: any[]
): JSXElement {
  const allProps = { ...(props || {}) };

  if (children.length > 0) {
    allProps.children = children.length === 1 ? children[0] : children;
  }

  console.log('createElement() called (classic):', {
    type,
    props: allProps,
    children,
  });

  return {
    type,
    props: allProps,
    key: allProps.key ?? null,
  };
}

/**
 * Check if a value is a valid JSX element
 */
export function isValidElement(obj: any): obj is JSXElement {
  const isValid =
    typeof obj === 'object' && obj !== null && 'type' in obj && 'props' in obj;
  console.log('isValidElement() called:', { obj, isValid });
  return isValid;
}

/**
 * Clone a JSX element with new props
 */
export function cloneElement(
  element: JSXElement,
  props?: Partial<JSXProps>,
  ...children: any[]
): JSXElement {
  const newProps = { ...element.props, ...(props || {}) };

  if (children.length > 0) {
    newProps.children = children.length === 1 ? children[0] : children;
  }

  console.log('cloneElement() called:', {
    element,
    newProps,
    children,
  });

  return {
    type: element.type,
    props: newProps,
    key: props?.key ?? element.key,
  };
}
