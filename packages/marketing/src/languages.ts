export const MARKETING_LANGUAGES = [
  { key: "english", label: "English" },
  { key: "tamil", label: "Tamil" },
  { key: "kannada", label: "Kannada" },
  { key: "telugu", label: "Telugu" },
  { key: "hindi", label: "Hindi" },
] as const;

export type MarketingLanguageKey = (typeof MARKETING_LANGUAGES)[number]["key"];

export function getLanguageLabel(key: string): string {
  return MARKETING_LANGUAGES.find((l) => l.key === key)?.label ?? key;
}
