const svg = (vb: string, body: string) =>
  `<svg viewBox="${vb}" fill="none" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

export const icons = {
  chevronLeft: svg('0 0 24 24', '<path d="M14.5 6L9 12l5.5 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  ellipsis: svg('0 0 24 24', '<circle cx="5.5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor"/>'),
  check: svg('0 0 24 24', '<path d="M5.5 12.5l4.2 4.2L18.5 8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  checkCircleOutline: svg('0 0 24 24', '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M8.4 12.3l2.5 2.5 4.7-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  signal: svg('0 0 20 14', '<rect x="0" y="9" width="3" height="5" rx="1" fill="currentColor"/><rect x="5" y="6" width="3" height="8" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="11" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="14" rx="1" fill="currentColor"/>'),
  wifi: svg('0 0 20 14', '<path d="M2 5.2C4.2 3 7 1.8 10 1.8S15.8 3 18 5.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 8.4c1.4-1.4 3.1-2.1 5-2.1s3.6.7 5 2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="11.6" r="1.7" fill="currentColor"/>'),
  battery: svg('0 0 27 14', '<rect x="0.8" y="0.8" width="21" height="12.4" rx="3.6" stroke="currentColor" stroke-width="1.4"/><rect x="3" y="3" width="14" height="8" rx="1.8" fill="currentColor"/><path d="M24.5 4.8v4.4c1.2-.3 2-1.1 2-2.2s-.8-1.9-2-2.2z" fill="currentColor" opacity="0.5"/>'),
  paperclip: svg('0 0 24 24', '<path d="M8.5 11.5l6.2-6.2a3.4 3.4 0 014.9 4.9l-7.8 7.8a5.5 5.5 0 11-7.8-7.8L11.4 2.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'),
  mic: svg('0 0 24 24', '<rect x="9" y="2.5" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.9"/><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'),
  arrowUp: svg('0 0 24 24', '<path d="M12 19V6m0 0l-5.5 5.5M12 6l5.5 5.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  code: svg('0 0 24 24', '<path d="M8.5 7L4 12l4.5 5M15.5 7L20 12l-4.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  share: svg('0 0 24 24', '<path d="M12 14.5V3.5m0 0L7.5 8M12 3.5L16.5 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 11.5v7a2 2 0 002 2h10a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  arrowLeft: svg('0 0 24 24', '<path d="M19 12H5m0 0l5.5-5.5M5 12l5.5 5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  cross: svg('0 0 24 24', '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
} as const;
