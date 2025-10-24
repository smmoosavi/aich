import type { Renderer } from './renderer';

export const DOMRenderer: Renderer<Node, HTMLElement, Text, Comment> = {
  createElement: (tag) => document.createElement(tag),
  createTextNode: (text) => document.createTextNode(text),
  createComment: (text) => document.createComment(text),

  appendChild: (parent, child) => parent.appendChild(child),
  insertBefore: (parent, newNode, ref) => parent.insertBefore(newNode, ref),
  replaceChild: (parent, newNode, oldNode) =>
    parent.replaceChild(newNode, oldNode),
  removeChild: (parent, child) => parent.removeChild(child),

  setTextContent: (node, text) => {
    node.textContent = text;
  },
  setAttribute: (el, name, value) => el.setAttribute(name, value),
  removeAttribute: (el, name) => el.removeAttribute(name),

  addEventListener: (el, event, listener) =>
    el.addEventListener(event, listener),
  removeEventListener: (el, event, listener) =>
    el.removeEventListener(event, listener),
};
