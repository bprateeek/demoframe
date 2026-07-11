const FORBIDDEN_BLOCKS = /<(script|foreignObject|iframe|object|embed|image)\b[\s\S]*?<\/\1\s*>/gi;
const FORBIDDEN_SELF_CLOSING = /<(script|foreignObject|iframe|object|embed|image)\b[^>]*\/?\s*>/gi;
const EVENT_HANDLER = /\s+on[a-z][a-z0-9:_-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const REMOTE_HREF = /\s+(?:href|xlink:href)\s*=\s*(["'])(?!#)[\s\S]*?\1/gi;
const UNSAFE_URL = /url\(\s*(["']?)(?!#)[^)]*\1\s*\)/gi;
const XML_HAZARD = /<!DOCTYPE[\s\S]*?>|<!ENTITY[\s\S]*?>/gi;

/** Sanitizes a local SVG for deterministic inline rendering. */
export function sanitizeSvg(source: string): string {
  if (!/<svg\b/i.test(source)) throw new Error('image asset is not an SVG document');
  const sanitized = source
    .replace(XML_HAZARD, '')
    .replace(FORBIDDEN_BLOCKS, '')
    .replace(FORBIDDEN_SELF_CLOSING, '')
    .replace(EVENT_HANDLER, '')
    .replace(REMOTE_HREF, '')
    .replace(UNSAFE_URL, 'none');
  if (/<(?:script|foreignObject|iframe|object|embed|image)\b/i.test(sanitized)) {
    throw new Error('SVG sanitizer could not remove an unsafe element');
  }
  return sanitized;
}

export function tintSvg(source: string, tint?: string): string {
  const safe = sanitizeSvg(source);
  if (!tint) return safe;
  return safe
    .replace(/\sfill\s*=\s*(["'])(?!none\1)[^"']*\1/gi, ` fill="${tint}"`)
    .replace(/\sstroke\s*=\s*(["'])(?!none\1)[^"']*\1/gi, ` stroke="${tint}"`);
}
