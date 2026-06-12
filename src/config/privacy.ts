export interface PrivacyFinding {
  path: string;
  kind: string;
  excerpt: string;
}

const PATTERNS: Array<{ kind: string; regex: RegExp }> = [
  { kind: 'email address', regex: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ },
  {
    kind: 'credential-shaped token',
    regex:
      /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bsk-[A-Za-z0-9_-]{20,}|\bxox[bpars]-[A-Za-z0-9-]{10,}|\bAKIA[0-9A-Z]{16}\b/,
  },
  { kind: 'JWT-shaped token', regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { kind: 'URL', regex: /https?:\/\/[^\s"']+/ },
  {
    kind: 'private-looking host',
    regex: /\blocalhost\b|\b127\.0\.0\.1\b|\b(?:10|192\.168)\.\d{1,3}\.\d{1,3}(?:\.\d{1,3})?\b/,
  },
  {
    kind: 'high-entropy string',
    regex: /(?=[A-Za-z0-9+/=_-]{32,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z0-9+/=_-]{32,}/,
  },
];

function excerptAround(value: string, match: string): string {
  const trimmed = match.length > 40 ? `${match.slice(0, 12)}...${match.slice(-6)}` : match;
  return value.length > 60 ? `...${trimmed}...` : trimmed;
}

export function scanForPrivateData(value: unknown, atPath = ''): PrivacyFinding[] {
  const findings: PrivacyFinding[] = [];
  walk(value, atPath, findings);
  return findings;
}

function walk(value: unknown, atPath: string, findings: PrivacyFinding[]): void {
  if (typeof value === 'string') {
    for (const { kind, regex } of PATTERNS) {
      const match = value.match(regex);
      if (match) {
        findings.push({ path: atPath || '(root)', kind, excerpt: excerptAround(value, match[0]) });
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${atPath}[${i}]`, findings));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      walk(child, atPath ? `${atPath}.${key}` : key, findings);
    }
  }
}
