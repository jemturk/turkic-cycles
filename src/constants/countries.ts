// Countries for the location picker, by their English name -- the value stored in
// profiles.country. (Names stay English in every app language so stored values are
// consistent and searchable; localized display names can come later.)
export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad",
  "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Côte d'Ivoire", "Croatia", "Cuba", "Cyprus",
  "Czechia", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji",
  "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala",
  "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hong Kong", "Hungary", "Iceland", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya",
  "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
  "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau",
  "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "São Tomé and Príncipe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles",
  "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa",
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago",
  "Tunisia", "Türkiye", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia",
  "Zimbabwe",
] as const;

// Shown first, above the full list, while the search box is empty: the Turkic
// countries plus where most members live.
export const SUGGESTED_COUNTRIES = [
  "Türkiye",
  "Azerbaijan",
  "Kazakhstan",
  "Uzbekistan",
  "Kyrgyzstan",
  "Turkmenistan",
  "United States",
  "Germany",
] as const;

// Other spellings already in the database (e.g. the mock users' "USA") or that
// people commonly type -- mapped to the list's name.
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "United States",
  us: "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  "united states of america": "United States",
  america: "United States",
  uk: "United Kingdom",
  "great britain": "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  turkey: "Türkiye",
  turkiye: "Türkiye",
  "türkiye cumhuriyeti": "Türkiye",
  "czech republic": "Czechia",
  "ivory coast": "Côte d'Ivoire",
  uae: "United Arab Emirates",
  "russian federation": "Russia",
  holland: "Netherlands",
};

// Lowercase without accents, so "turkiye" finds "Türkiye" and "sao tome" finds
// "São Tomé and Príncipe".
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .toLowerCase()
    .trim();
}

// The list's name for a stored or typed country, or the input unchanged when it
// isn't recognized (free text from before the picker existed stays as it was).
export function canonicalCountry(value: string | null | undefined): string {
  if (!value) return "";
  const alias = COUNTRY_ALIASES[value.trim().toLowerCase()];
  if (alias) return alias;
  const needle = normalizeForSearch(value);
  return COUNTRIES.find((c) => normalizeForSearch(c) === needle) ?? value;
}

export type RegionOption = { value: string; label: string };

// What the field after City is, per country:
//   "list"     -- a required picker (stores the short code, e.g. "NC")
//   "optional" -- a free-text "State / region", may be left empty
type RegionConfig =
  | { kind: "list"; labelKey: "location.state" | "location.province" | "location.stateTerritory"; options: RegionOption[] }
  | { kind: "optional" };

const US_STATES: RegionOption[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
  ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
].map(([value, label]) => ({ value, label }));

const CANADA_PROVINCES: RegionOption[] = [
  ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"],
  ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"], ["NT", "Northwest Territories"],
  ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"],
  ["SK", "Saskatchewan"], ["YT", "Yukon"],
].map(([value, label]) => ({ value, label }));

const AUSTRALIA_STATES: RegionOption[] = [
  ["ACT", "Australian Capital Territory"], ["NSW", "New South Wales"], ["NT", "Northern Territory"],
  ["QLD", "Queensland"], ["SA", "South Australia"], ["TAS", "Tasmania"], ["VIC", "Victoria"],
  ["WA", "Western Australia"],
].map(([value, label]) => ({ value, label }));

const REGION_CONFIGS: Record<string, RegionConfig> = {
  "United States": { kind: "list", labelKey: "location.state", options: US_STATES },
  Canada: { kind: "list", labelKey: "location.province", options: CANADA_PROVINCES },
  Australia: { kind: "list", labelKey: "location.stateTerritory", options: AUSTRALIA_STATES },
};

export function regionConfigFor(country: string | null | undefined): RegionConfig {
  return REGION_CONFIGS[canonicalCountry(country)] ?? { kind: "optional" };
}

// A stored state matches a list option by its code ("NC") or its full name
// ("North Carolina", typed before the picker existed). Returns the option's code.
export function matchRegionOption(options: RegionOption[], value: string | null | undefined): string | null {
  if (!value) return null;
  const needle = normalizeForSearch(value);
  const option = options.find((o) => normalizeForSearch(o.value) === needle || normalizeForSearch(o.label) === needle);
  return option?.value ?? null;
}
