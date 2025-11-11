const name = new WeakMap<Function, string>();
const indexes = new Map<string, number>();

function getIndex(prefix: string): number {
  let index = indexes.get(prefix) ?? 0;
  index++;
  indexes.set(prefix, index);
  return index;
}

export function getName(effect: Function, prefix: string = ''): string {
  if (!name.has(effect)) {
    const effectName = effect.name;
    const index = getIndex(prefix);
    const num = gray(`#${prefix}${index}`);
    name.set(effect, `${effectName}${num}`);
  }
  return name.get(effect)!;
}

function gray(text: string): string {
  return `\x1b[90m${text}\x1b[0m`;
}
