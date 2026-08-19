const MAX_LABEL_LENGTH = 120;

function clean(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL_LENGTH);
}

function fromLabelFor(el: HTMLElement): string {
  if (!el.id) return '';
  const root = el.getRootNode() as ParentNode;
  const label = root.querySelector?.(`label[for="${CSS.escape(el.id)}"]`);
  return clean(label?.textContent);
}

function fromAncestorLabel(el: HTMLElement): string {
  return clean(el.closest('label')?.textContent);
}

function fromAriaLabelledBy(el: HTMLElement): string {
  const ids = el.getAttribute('aria-labelledby');
  if (!ids) return '';
  const root = el.getRootNode() as ParentNode;
  return clean(
    ids
      .split(/\s+/)
      .map((id) => root.querySelector?.(`#${CSS.escape(id)}`)?.textContent ?? '')
      .join(' '),
  );
}

/**
 * Walks backwards through preceding siblings (and up to a few ancestors)
 * looking for nearby visible text — the last-resort heuristic for forms with
 * no proper label markup.
 */
function fromNearbyText(el: HTMLElement): string {
  let node: HTMLElement | null = el;
  for (let depth = 0; node && depth < 3; depth++) {
    let sibling = node.previousElementSibling;
    while (sibling) {
      if (!sibling.querySelector('input, textarea, select')) {
        const text = clean(sibling.textContent);
        if (text) return text;
      }
      sibling = sibling.previousElementSibling;
    }
    node = node.parentElement;
  }
  return '';
}

/**
 * Resolves a human-readable label for a form control, by priority:
 * label[for] → wrapping label → aria-label → aria-labelledby → placeholder →
 * nearby preceding text.
 */
export function resolveLabel(el: HTMLElement): string {
  return (
    fromLabelFor(el) ||
    fromAncestorLabel(el) ||
    clean(el.getAttribute('aria-label')) ||
    fromAriaLabelledBy(el) ||
    clean(el.getAttribute('placeholder')) ||
    fromNearbyText(el)
  );
}
