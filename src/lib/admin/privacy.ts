const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const PII_FIELD_PATTERN = /\b(?:e ?mail|name|first name|last name|full name|speaker|reviewer|attendee|customer|contact|recipient)\b/i;

const NON_NAME_PATTERN = /\b(?:email|status|ticket|company|organisation|organization|role|type|date|time|amount|price|phone|address)\b/i;

export const ADMIN_PRIVACY_STORAGE_KEY = 'zurichjs.admin.privacy-mode';
export const ADMIN_PRIVACY_BODY_CLASS = 'admin-privacy-mode';

function normalizeDescriptor(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function describesPiiField(value: string): boolean {
  return PII_FIELD_PATTERN.test(normalizeDescriptor(value));
}

export function getSensitiveColumnIndexes(headers: string[]): number[] {
  return headers.flatMap((header, index) => describesPiiField(header) ? [index] : []);
}

export function looksLikeName(value: string): boolean {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > 80 || containsEmail(normalized) || NON_NAME_PATTERN.test(normalized)) {
    return false;
  }

  const words = normalized.split(' ');
  return words.length <= 6 && words.every((word) => /^[\p{L}'’.-]+$/u.test(word));
}

function markPrivate(element: Element, reason: 'email' | 'name' | 'field'): void {
  if (element.closest('[data-admin-privacy-control]')) return;
  element.setAttribute('data-admin-pii', reason);
}

function directText(element: Element): string {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function markPiiControls(root: ParentNode): void {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select, [contenteditable="true"]',
  ).forEach((control) => {
    const labels = 'labels' in control && control.labels
      ? Array.from(control.labels).map((label) => label.textContent ?? '').join(' ')
      : '';
    const descriptor = [
      control.getAttribute('type'),
      control.getAttribute('name'),
      control.id,
      control.getAttribute('autocomplete'),
      control.getAttribute('placeholder'),
      control.getAttribute('aria-label'),
      labels,
    ].filter(Boolean).join(' ');

    if (control.getAttribute('type') === 'email' || describesPiiField(descriptor)) {
      markPrivate(control, 'field');
    }
  });
}

function markPiiTableColumns(root: ParentNode): void {
  root.querySelectorAll('table').forEach((table) => {
    const headerRow = table.querySelector('thead tr') ?? table.querySelector('tr');
    if (!headerRow) return;

    const headers = Array.from(headerRow.children).map((header) => header.textContent ?? '');
    const sensitiveIndexes = getSensitiveColumnIndexes(headers);
    if (sensitiveIndexes.length === 0) return;

    table.querySelectorAll('tbody tr').forEach((row) => {
      sensitiveIndexes.forEach((index) => {
        const cell = row.children.item(index);
        if (cell) markPrivate(cell, describesPiiField(headers[index]) && /email/i.test(headers[index]) ? 'email' : 'name');
      });
    });
  });
}

function markLabelledValues(root: ParentNode): void {
  root.querySelectorAll('label, dt').forEach((label) => {
    if (!describesPiiField(label.textContent ?? '')) return;
    if (label instanceof HTMLLabelElement && label.htmlFor) {
      const control = document.getElementById(label.htmlFor);
      if (control) markPrivate(control, 'field');
    }
    if (label.nextElementSibling) markPrivate(label.nextElementSibling, 'field');
  });

  root.querySelectorAll('span, p').forEach((label) => {
    const text = directText(label);
    if (!text || text.length > 30 || !describesPiiField(text)) return;
    if (label.nextElementSibling && label.parentElement && label.parentElement.children.length <= 4) {
      markPrivate(label.nextElementSibling, 'field');
    }
  });
}

function markEmailTextAndPairedNames(root: ParentNode): void {
  root.querySelectorAll('a[href^="mailto:"]').forEach((link) => markPrivate(link, 'email'));

  const emailElements: Element[] = [];
  root.querySelectorAll('body *').forEach((element) => {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG'].includes(element.tagName)) return;
    if (containsEmail(directText(element))) {
      markPrivate(element, 'email');
      emailElements.push(element);
    }
  });

  emailElements.forEach((emailElement) => {
    const sibling = emailElement.previousElementSibling;
    if (sibling && looksLikeName(sibling.textContent ?? '')) {
      markPrivate(sibling, 'name');
    }
  });
}

export function markAdminPii(root: ParentNode = document): void {
  markPiiControls(root);
  markPiiTableColumns(root);
  markLabelledValues(root);
  markEmailTextAndPairedNames(root);
}

export function observeAdminPii(): () => void {
  let animationFrame: number | undefined;
  const scan = () => {
    animationFrame = undefined;
    markAdminPii(document);
  };
  const scheduleScan = () => {
    if (animationFrame === undefined) animationFrame = window.requestAnimationFrame(scan);
  };

  scan();
  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  return () => {
    observer.disconnect();
    if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
  };
}
