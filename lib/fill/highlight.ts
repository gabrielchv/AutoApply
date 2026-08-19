const STYLE_ID = 'autoapply-styles';

const CSS = `
.autoapply-filled {
  outline: 2px solid #22a06b !important;
  outline-offset: 1px;
  transition: outline-color 1s ease 3s;
}
.autoapply-filled--fading {
  outline-color: transparent !important;
}
.autoapply-manual {
  outline: 2px solid #e2a200 !important;
  outline-offset: 1px;
}
`;

export function ensureHighlightStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}

/** Green outline that fades a few seconds later. */
export function markFilled(el: HTMLElement): void {
  ensureHighlightStyles(el.ownerDocument);
  el.classList.add('autoapply-filled');
  setTimeout(() => el.classList.add('autoapply-filled--fading'), 100);
}

/** Persistent amber outline for fields the user must handle themselves. */
export function markNeedsManual(el: HTMLElement, hint: string): void {
  ensureHighlightStyles(el.ownerDocument);
  el.classList.add('autoapply-manual');
  if (!el.title) el.title = hint;
}
