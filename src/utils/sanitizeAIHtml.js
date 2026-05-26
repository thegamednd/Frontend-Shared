import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'a',
  'br',
  'p',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'code',
  'pre',
  'blockquote',
];

const ALLOWED_ATTR = ['href'];

const config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'link', 'meta', 'base', 'img', 'video', 'audio'],
  KEEP_CONTENT: true,
};

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer');
    const href = node.getAttribute('href') || '';
    const safe = href.startsWith('/') || /^https?:\/\//i.test(href);
    if (!safe) {
      node.removeAttribute('href');
    } else if (/^https?:\/\//i.test(href)) {
      node.setAttribute('target', '_blank');
    }
  }
});

export function sanitizeAIHtml(input) {
  if (input == null) return '';
  return DOMPurify.sanitize(String(input), config);
}

export default sanitizeAIHtml;
