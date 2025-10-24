/**
 * A generic interface describing a rendering backend.
 *
 * TNode represents an element or text/comment node type.
 * TElement is a subset of TNode that represents element nodes.
 * TText represents text nodes.
 * TComment represents comment nodes.
 */
export interface Renderer<
  TNode = any,
  TElement extends TNode = TNode,
  TText extends TNode = TNode,
  TComment extends TNode = TNode,
> {
  // --- Node creation ---
  createElement(tag: string): TElement;
  createTextNode(text: string): TText;
  createComment(text: string): TComment;

  // --- Tree manipulation ---
  appendChild(parent: TNode, child: TNode): void;
  insertBefore(
    parent: TNode,
    newNode: TNode,
    referenceNode: TNode | null,
  ): void;
  replaceChild(parent: TNode, newNode: TNode, oldNode: TNode): void;
  removeChild(parent: TNode, child: TNode): void;

  // --- Attributes & content ---
  setTextContent(node: TNode, text: string): void;
  setAttribute(el: TElement, name: string, value: string): void;
  removeAttribute(el: TElement, name: string): void;

  // --- Events ---
  addEventListener(el: TElement, event: string, listener: EventListener): void;
  removeEventListener(
    el: TElement,
    event: string,
    listener: EventListener,
  ): void;
}
