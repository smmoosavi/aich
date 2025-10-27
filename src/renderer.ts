import type { Brand } from './brand';

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

// --- Type utilities to extract specific types from a Renderer ---

export type RendererElement<R> =
  R extends Renderer<any, infer TElement, any, any> ? TElement : never;

export type RendererText<R> =
  R extends Renderer<any, any, infer TText, any> ? TText : never;

export type RendererComment<R> =
  R extends Renderer<any, any, any, infer TComment> ? TComment : never;

export type RendererNode<R> =
  R extends Renderer<infer TNode, any, any, any> ? TNode : never;

/*
 * Placeholder types representing any TElement, TText, and TComment.
 */

export type AnyTElement = Brand<'TElement'>;
export type AnyTText = Brand<'TText'>;
export type AnyTComment = Brand<'TComment'>;
export type AnyTNode = AnyTElement | AnyTText | AnyTComment;
/*
 * A placeholder type representing any renderer.
 */
export type AnyRenderer = Renderer<
  AnyTNode,
  AnyTElement,
  AnyTText,
  AnyTComment
>;
