export function prettyDOM(dom?: Element) {
  // 1- only contents of element is printed not the element itself
  // 2- if children are only text node is collapsed
  // example output:
  //   `
  //   "<div>
  //     <ul>
  //       <li data-test-id="li-1">Item 2</li>
  //       <li data-test-id="li-2">Item 3</li>
  //       <li>Item 4</li>
  //     </ul>
  //   </div>"
  // `

  if (!dom) {
    return '';
  }

  function serializeNode(node: Node, indent: string = ''): string {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() || '';
      return text ? text : '';
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      // Build opening tag with attributes
      let openTag = `<${tagName}`;
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        openTag += ` ${attr.name}="${attr.value}"`;
      }
      openTag += '>';
      
      const closeTag = `</${tagName}>`;
      
      // Check if all children are text nodes
      const children = Array.from(element.childNodes);
      const allTextNodes = children.every(child => child.nodeType === Node.TEXT_NODE);
      
      if (allTextNodes) {
        // Collapse: put everything on one line
        const textContent = children
          .map(child => child.textContent || '')
          .join('')
          .trim();
        return `${indent}${openTag}${textContent}${closeTag}`;
      } else {
        // Expand: put children on separate lines with increased indentation
        const childIndent = indent + '  ';
        const lines: string[] = [];
        
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent?.trim() || '';
            if (text) {
              // Collect consecutive text nodes
              const textParts = [text];
              let j = i + 1;
              while (j < children.length && children[j].nodeType === Node.TEXT_NODE) {
                const nextText = children[j].textContent?.trim() || '';
                if (nextText) {
                  textParts.push(nextText);
                }
                j++;
              }
              // Add all consecutive text nodes as one line
              lines.push(`${childIndent}${textParts.join(' ')}`);
              i = j - 1; // Skip the text nodes we've already processed
            }
          } else {
            const serialized = serializeNode(child, childIndent);
            if (serialized) {
              lines.push(serialized);
            }
          }
        }
        
        if (lines.length > 0) {
          return `${indent}${openTag}\n${lines.join('\n')}\n${indent}${closeTag}`;
        } else {
          return `${indent}${openTag}${closeTag}`;
        }
      }
    }

    return '';
  }

  // Serialize only the contents (children) of the element
  const children = Array.from(dom.childNodes);
  const result = children
    .map(child => serializeNode(child, ''))
    .filter(s => s.length > 0)
    .join('\n');
  
  return result;
}
