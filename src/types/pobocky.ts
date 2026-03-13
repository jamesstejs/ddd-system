/**
 * České kraje (pobočky) pro přiřazení techniků k regionům.
 */
export const POBOCKY = [
  { value: "praha", label: "Praha" },
  { value: "stredocesky", label: "Středočeský" },
  { value: "jihocesky", label: "Jihočeský" },
  { value: "plzensky", label: "Plzeňský" },
  { value: "karlovarsky", label: "Karlovarský" },
  { value: "ustecky", label: "Ústecký" },
  { value: "liberecky", label: "Liberecký" },
  { value: "kralovehradecky", label: "Královéhradecký" },
  { value: "pardubicky", label: "Pardubický" },
  { value: "vysocina", label: "Vysočina" },
  { value: "jihomoravsky", label: "Jihomoravský" },
  { value: "olomoucky", label: "Olomoucký" },
  { value: "zlinsky", label: "Zlínský" },
  { value: "moravskoslezsky", label: "Moravskoslezský" },
] as const;

export type Pobocka = (typeof POBOCKY)[number]["value"];

/** Lookup label by value */
export const POBOCKA_LABELS: Record<Pobocka, string> = Object.fromEntries(
  POBOCKY.map((p) => [p.value, p.label]),
) as Record<Pobocka, string>;
