// Patch existing nodes so polling does not detach decoded images, seats or inputs.
export function patchHtml(root: HTMLElement, html: string) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const key = (node: Node) => node instanceof Element
    ? node.id || node.getAttribute('data-ui-key') || '' : '';
  const compatible = (a: Node, b: Node) => a.nodeType === b.nodeType &&
    (!(a instanceof Element) || b instanceof Element && a.tagName === b.tagName) && key(a) === key(b);
  function patch(parent: Node, source: Node) {
    let cursor = parent.firstChild;
    for (const next of [...source.childNodes]) {
      let current = cursor;
      if (!current || !compatible(current, next)) {
        current = [...parent.childNodes].find(n => n !== cursor && key(next) && compatible(n, next)) ?? null;
        if (current) parent.insertBefore(current, cursor);
        else { parent.insertBefore(next.cloneNode(true), cursor); continue; }
      }
      if (current instanceof Element && next instanceof Element) {
        for (const attr of [...current.attributes]) if (!next.hasAttribute(attr.name)) current.removeAttribute(attr.name);
        for (const attr of [...next.attributes]) if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value);
        patch(current, next);
      } else if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
      cursor = current.nextSibling;
    }
    while (cursor) { const next = cursor.nextSibling; parent.removeChild(cursor); cursor = next; }
  }
  patch(root, template.content);
}
