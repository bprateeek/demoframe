export function nfc(value: string): string {
  return value.normalize('NFC');
}

export function nfcContains(text: string, exactCopy: string): boolean {
  return nfc(text).includes(nfc(exactCopy));
}

function identityTokens(value: string): string[] {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function identityTokenSubsequence(text: string, identity: string): boolean {
  const needle = identityTokens(identity);
  if (needle.length === 0) {
    return text.normalize('NFKC').includes(identity.normalize('NFKC'));
  }
  const haystack = identityTokens(text);
  let at = 0;
  for (const token of haystack) {
    if (token === needle[at]) at += 1;
    if (at === needle.length) return true;
  }
  return false;
}
