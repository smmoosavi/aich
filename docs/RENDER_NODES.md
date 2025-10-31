# Render Nodes

render nodes keep expected order of dom nodes during rendering and updateing process is challenging task. This document explains how render nodes work in our framework.

## types of children

When rendering a list of children, there are few main types to consider:

```ts
render(container, () => () => (
  <div>
    {/* Static children */}
    <span>Static Child 1</span>
    <span>Dynamic Child {count}</span>
    <span>re-render {rerender()}</span>

    {/* single thunk child */}
    {() => <span>Thunk Child</span>}

    {/* thunk returning array of children */}
    {() => [<span>Array Child 1</span>, <span>Array Child 2</span>]}

    {/* thunk returning array of thunks */}
    {() => [
      () => <span>Thunk Array Child 1</span>,
      () => <span>Thunk Array Child 2</span>,
    ]}
  </div>
));
```

## Keyed vs Unkeyed Children

When rendering lists of children, it's important to distinguish between keyed and unkeyed children. Keyed children have a unique identifier (key) that helps the rendering engine track them across updates. This is especially useful when the order of children can change, or when children can be added or removed

```ts
render(container, () => (
  <div>
    {/* Unkeyed children */}
    {() => items().map((item) => <span>{item}</span>)}

    {/* Keyed children */}
    {() => items().map((item) => <span key={item.id}>{item.name}</span>)}
  </div>
));
```

## rule of updates

### idempotent rendering

we have a function that generates children based on some state. no matter how many update is called. if we unmount and mount again the same function, it should produce the same dom structure.

```ts
const unmount = render(container, () => f());
// do some updates
const snapshot = container.innerHTML;
unmount();

// render again
render(container, () => f());
assert(container.innerHTML === snapshot);
```

### unique keys

when using keyed children, each key must be unique among its siblings. if two children share the same key, the behavior is undefined. static, array, thunk children share the same key namespace.

```ts
// all keys are in the same namespace
render(container, () => (
  <div>
    <span key="unique-key-1">Child 1</span>
    {[<span key="unique-key-2">Child 2</span>]}
    {() => <span key="unique-key-3">Child 3</span>}
  </div>
));
```

in the case of thunk children, the uniqueness of keys is enforced at the end of the batch update. in this example, at the middle of the thunk execution, both thunk children have the same key "a", but at the end of the batch update, they have different keys, so the rule is not violated.

```ts
const swap = state(false);
render(container, () => (
  <div>
    {() => (!swap() ? <span key="a">A</span> : <span key="b">B</span>)}
    <span key="c">C</span>
    {() => (swap() ? <span key="a">A</span> : <span key="b">B</span>)}
  </div>
));

// initial render
// a c b
// swap(true)
// b c a
// unmount and rerender
// b c a
// rule of update is respected
```

if a thunk child steals the key of a another thunk child during update, it means that its old node is removed, and the other thunk child take over its node.

```ts
const take = state(false);
render(container, () => (
  <div>
    {() => (take() ? <span key="b">B</span> : <span key="a">A</span>)}
    <span key="c">C</span>
    {() => <span key="b">B</span>}
  </div>
));

// initial render
// a c b
// take(true)
// b c
// unmount and rerender
// b c
// rule of update is respected
```

if a thunk child steals the key of a static child during update, and we move the static child to its new position, the rule of updates is broken. so we should show error in this case.

```ts
const take = state(false);
render(container, () => (
  <div>
    {() => (take() ? <span key="c">C</span> : <span key="a">A</span>)}
    <span key="c">C</span>
    {() => <span key="b">B</span>}
  </div>
));

// initial render
// a c b
// take(true)
// c b // a removed and c moved
// unmount and rerender
// c c b
// both rule of updates and unique keys are violated
```

## types of updates

When the state changes, the rendering engine needs to update the DOM accordingly. There are several types of updates to consider:

### re-render updates

when a value readed during thunk execution changes, the thunk is re-executed and all its children are re-rendered. in this case, we have less assumptions about what changed, so we need to compare all children and update them accordingly. In some cases this may return totally new set of nodes.

this is not idomatic way of updating the dom, but we should be able to handle it correctly.

```ts
render(container, () => {
  if (items().length === 0) {
    return <div>No items</div>;
  }
  return (
    <div>
      {items().map((item) => (
        <span>{item}</span>
      ))}
    </div>
  );
});
```

in examples we demonstrate re-render with `const state = rerender(0);` and reading `rerender()` inside the thunk.

### Thunk Children updates

Thunks are functions that return JSX elements or text. When a thunk is used as a child, it is executed to produce the child elements. If the state read during the thunk execution changes, the thunk is re-executed, and its children are updated accordingly.

```ts
render(container, () => (
  <div>{() => <span>Dynamic Child {count()}</span>}</div>
));
```

thunks can also return arrays of children, which can be either static elements or other thunks.

```ts
render(container, () => (
  <div>
    {() => [
      <span>Array Child 1</span>,
      () => <span>Thunk Array Child {count()}</span>,
    ]}
  </div>
));
```

a child in thunk can also be keyed, in updates it can has the key of other thunk child, but does not allowed to stole the key of static child. if a thunk child stole the key of static child, and we remove the static child, the rule of updates will be broken.

## Example: Dynamic Scoreboard

scoreboard is a good example to illustrate the challenges of rendering nodes. Imagine you have a list of players in a game, and you want to display their scores. The list of players can change dynamically (players can join or leave), and you want to ensure that the DOM nodes representing each player are updated correctly without losing their state (like input focus, animations, etc.).

```ts
const turn = state(0);
// state always holds sorted items
const items = state([
  { id: 'player 1', score: 0 },
  { id: 'player 2', score: 0 },
  { id: 'player 3', score: 0 },
  { id: 'player 4', score: 0 },
  { id: 'player 5', score: 0 },
  { id: 'player 6', score: 0 },
]);
const rerender = state(0);

// derivedArray helper give us array of thunks that returns items in the state and notify updates when items change. it accept a key function to identify each item.
const derivedItems: Array<Thunk<Item>> = derivedArray(items, (item) => item.id);

render(container, () => (
  <div>
    turn {turn}
    <span>re-render {rerender()}</span>
    {() =>
      derivedItems().map((item, index) => () => (
        <div key={item.id}>
          {item.id}: {item.score}
        </div>
      ))
    }
  </div>
));
```

### senario 0: mount

first render, all items are added to the dom.

### senario 1: updating turns

when the turn changes, we just update the turn state. this will not affect the dom nodes. the text node it self will be updated.

```ts
turn(1); // turn changes from 0 to 1
```

### senario 2: updating scores without changing order

when a player's score changes, we update the corresponding item in the items state. the tunks of corresponding players will be re-executed, the key is the same, at the point of view of the parent div, the dom nodes are the same, and we should the child div update itself.

```ts
items(
    replaceItem(items(), 'player 3', (item) => ({
        ...item,
        score: item.score + 10,
    })
)
```

### senario 3: a new player joins

```ts
items(insertItem(items(), { id: 'player 7', score: 0 }));
```

### senario 3: a new player joins at the middle or start

```ts
items(insertItemAt(items(), 3, { id: 'player 7', score: 0 }));
items(insertItemAt(items(), 0, { id: 'player 0', score: 0 }));
```

### senario 4: a player leaves

```ts
items(removeItem(items(), 'player 2'));
```

### senario 5: move positions of players

```ts
// 1 2 3 4 5 6
items(moveItemTo(items(), 1, 'player 4'));
// 1 4 2 3 5 6
```

### senario 6: complex updates

5 kills 3 and go to 1st position, 7 added at last position

```ts
// 1 2 3 4 5 6
const old = items();
const new = [
  old[4], // player 5
  old[0], // player 1
  old[2], // player 2
  // player 3
  old[1], // player 4
  old[5], // player 6
  { id: 'player 7', score: 0 }, // new player 7
];
items(new);
```

### senario 7: force re-render

```ts
rerender(rerender() + 1);
```

### senario 8: unmount

```ts
unmount();
```

## rerender strategy

we track children by keys.
we keep track of next/prev sibling pointers for each render node, if every next/prev is correct, then the order is correct.
we track the first and last child of each parent render node, so we can insert new nodes at correct position and find first/last child easily.
we track each child is rendered in which thunk, so when a thunk is re-executed, we can find all its children easily.

### first render

in the first render, we simply create all dom nodes in order.

### unmounting

when unmounting, we simply remove all dom nodes from the parent.
todo: dispose effects

### force rerender

when force rerender is called, we re-execute the root thunk, and compare the new set of children with the old set of children, and update them accordingly. if before or after children is empty, we can simply add or remove all children.

first all children maked as unwanted. render children. new children are marked as wanted.

- if a child is wanted but not found in the new set, it is removed. (removed)
- if a child is unwanted but found in the new set, it is moved to the correct position. also re-rendered itself. (moved+updated)
- if a child is wanted and not unwanted, it is re-rendered itself. and moved to the correct position if needed. (created)

### updating thunks

when a thunk is re-executed, we compare the new set of children with the old set of children, and update them accordingly. if before or after children is empty, we can simply add or remove all children. new children may have the key of other thunk children, so it moves the dom node from other thunk to itself. but it cannot steal the key of static or static array children.

first all children maked as unwanted. render children. new children are marked as wanted.
all other pending thunk should be executed
then we apply wanted/unwanted logic

### order apply

for each child we check next sibling pointers. if they are correct, we do nothing. we can find chains of correct order nodes, and skip them.
then we find shortest correct chain and move nodes before/after it to correct position.

```
example

1 2 3 4 5 6 7 8 9
to
1 2 3 7 8 4 5 6 9

we have these chains (all next is ok, except the last item of chain) chain 9 is correct chain because all next is correct so it need no change

shortest chain i s 7 8, so we move it

1 2 3
4 5 6
7 8
9

we should move 7 and 8 between 3 and 4

insert 7 before 4
insert 8 before 4

keep going until all nodes has correct next pointers
```
