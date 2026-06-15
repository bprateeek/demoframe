export const DESTINATION_NAMES = ['github-readme', 'x-post', 'linkedin', 'product-hunt'] as const;

export type DestinationName = (typeof DESTINATION_NAMES)[number];
