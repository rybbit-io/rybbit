// Population data in millions (2023 estimates)
export const countryPopulations: Record<string, number> = {
  // Major countries
  US: 331.9, // United States
  CN: 1412.2, // China
  IN: 1408.0, // India
  ID: 273.8, // Indonesia
  PK: 231.4, // Pakistan
  BR: 214.3, // Brazil
  NG: 213.4, // Nigeria
  BD: 169.4, // Bangladesh
  RU: 145.5, // Russia
  MX: 126.7, // Mexico
  JP: 125.7, // Japan
  PH: 115.6, // Philippines
  ET: 123.4, // Ethiopia
  EG: 110.0, // Egypt
  VN: 98.2, // Vietnam
  CD: 99.0, // DR Congo
  TR: 84.3, // Turkey
  IR: 87.9, // Iran
  DE: 83.8, // Germany
  TH: 71.7, // Thailand
  GB: 67.3, // United Kingdom
  FR: 65.5, // France
  TZ: 63.6, // Tanzania
  ZA: 59.3, // South Africa
  IT: 60.3, // Italy
  KE: 54.0, // Kenya
  MM: 54.8, // Myanmar
  CO: 51.5, // Colombia
  KR: 51.3, // South Korea
  UG: 47.1, // Uganda
  ES: 47.4, // Spain
  AR: 45.8, // Argentina
  DZ: 44.6, // Algeria
  SD: 45.7, // Sudan
  UA: 43.8, // Ukraine (pre-war estimate)
  IQ: 43.5, // Iraq
  AF: 38.9, // Afghanistan
  PL: 37.8, // Poland
  CA: 38.2, // Canada
  MR: 3.0, // Mauritania
  SA: 35.3, // Saudi Arabia
  UZ: 34.2, // Uzbekistan
  PE: 33.4, // Peru
  AO: 34.5, // Angola
  MY: 33.6, // Malaysia
  GH: 32.8, // Ghana
  MZ: 32.9, // Mozambique
  YE: 33.7, // Yemen
  NP: 30.0, // Nepal
  VE: 28.4, // Venezuela
  CM: 27.9, // Cameroon
  CI: 27.5, // Côte d'Ivoire
  AU: 25.7, // Australia
  NE: 25.4, // Niger
  TW: 23.8, // Taiwan
  SY: 21.3, // Syria
  ML: 21.9, // Mali
  BF: 21.5, // Burkina Faso
  MW: 19.6, // Malawi
  ZM: 19.4, // Zambia
  KZ: 18.9, // Kazakhstan
  CL: 19.2, // Chile
  EC: 17.9, // Ecuador
  GT: 17.1, // Guatemala
  SN: 17.2, // Senegal
  RS: 6.7, // Serbia
  NL: 17.5, // Netherlands
  KH: 16.7, // Cambodia
  TD: 17.4, // Chad
  SO: 17.1, // Somalia
  ZW: 15.2, // Zimbabwe
  GN: 13.5, // Guinea
  RW: 13.4, // Rwanda
  BJ: 13.0, // Benin
  BI: 12.5, // Burundi
  TN: 12.0, // Tunisia
  BO: 11.7, // Bolivia
  BE: 11.6, // Belgium
  HT: 11.5, // Haiti
  CU: 11.3, // Cuba
  SS: 11.3, // South Sudan
  DO: 10.9, // Dominican Republic
  JO: 10.2, // Jordan
  CZ: 10.7, // Czech Republic
  SE: 10.4, // Sweden
  AZ: 10.2, // Azerbaijan
  GR: 10.6, // Greece
  PT: 10.2, // Portugal
  AE: 9.9, // United Arab Emirates
  HU: 9.7, // Hungary
  TJ: 9.5, // Tajikistan
  BY: 9.4, // Belarus
  IL: 9.2, // Israel
  AT: 9.1, // Austria
  CH: 8.7, // Switzerland
  PG: 9.1, // Papua New Guinea
  HN: 10.0, // Honduras
  TG: 8.6, // Togo
  SL: 8.1, // Sierra Leone
  LA: 7.4, // Laos
  PY: 7.3, // Paraguay
  NI: 6.8, // Nicaragua
  LY: 7.0, // Libya
  SV: 6.5, // El Salvador
  KG: 6.5, // Kyrgyzstan
  TM: 6.0, // Turkmenistan
  SG: 5.9, // Singapore
  DK: 5.8, // Denmark
  FI: 5.5, // Finland
  SK: 5.4, // Slovakia
  NO: 5.4, // Norway
  CG: 5.8, // Congo (Brazzaville)
  ER: 3.6, // Eritrea
  IE: 5.0, // Ireland
  PS: 5.1, // Palestine
  CR: 5.1, // Costa Rica
  NZ: 5.1, // New Zealand
  LB: 6.8, // Lebanon
  CF: 4.9, // Central African Republic
  OM: 5.1, // Oman
  PA: 4.3, // Panama
  KW: 4.3, // Kuwait
  HR: 4.0, // Croatia
  GE: 3.7, // Georgia
  UY: 3.5, // Uruguay
  BA: 3.3, // Bosnia and Herzegovina
  MN: 3.3, // Mongolia
  MD: 2.6, // Moldova
  JM: 2.9, // Jamaica
  AM: 2.9, // Armenia
  AL: 2.8, // Albania
  QA: 2.9, // Qatar
  RO: 19.1, // Romania
  LT: 2.8, // Lithuania
  BW: 2.4, // Botswana
  NA: 2.5, // Namibia
  GM: 2.4, // Gambia
  GA: 2.3, // Gabon
  LS: 2.1, // Lesotho
  SI: 2.1, // Slovenia
  MK: 2.1, // North Macedonia
  LV: 1.9, // Latvia
  GW: 2.0, // Guinea-Bissau
  GQ: 1.4, // Equatorial Guinea
  TT: 1.4, // Trinidad and Tobago
  BH: 1.7, // Bahrain
  TL: 1.3, // Timor-Leste
  EE: 1.3, // Estonia
  MU: 1.3, // Mauritius
  CY: 0.9, // Cyprus
  SZ: 1.2, // Eswatini
  DJ: 1.0, // Djibouti
  FJ: 0.9, // Fiji
  RE: 0.9, // Réunion
  KM: 0.8, // Comoros
  GY: 0.8, // Guyana
  BT: 0.8, // Bhutan
  SB: 0.7, // Solomon Islands
  MQ: 0.4, // Martinique
  LU: 0.6, // Luxembourg
  SR: 0.6, // Suriname
  CV: 0.6, // Cabo Verde
  MV: 0.5, // Maldives
  MT: 0.5, // Malta
  BN: 0.4, // Brunei
  BG: 6.8, // Bulgaria
  BZ: 0.4, // Belize
  BS: 0.4, // Bahamas
  IS: 0.4, // Iceland
  GP: 0.4, // Guadeloupe
  VU: 0.3, // Vanuatu
  NC: 0.3, // New Caledonia
  PF: 0.3, // French Polynesia
  WS: 0.2, // Samoa
  ST: 0.2, // Sao Tome and Principe
  KI: 0.1, // Kiribati
  FM: 0.1, // Micronesia
  TO: 0.1, // Tonga
  SC: 0.1, // Seychelles
  VC: 0.1, // Saint Vincent and the Grenadines
  GD: 0.1, // Grenada
  LC: 0.1, // Saint Lucia
  AG: 0.1, // Antigua and Barbuda
  DM: 0.1, // Dominica
  KN: 0.05, // Saint Kitts and Nevis
  MH: 0.06, // Marshall Islands
  SM: 0.03, // San Marino
  MC: 0.04, // Monaco
  LI: 0.04, // Liechtenstein
  AD: 0.08, // Andorra
  PW: 0.02, // Palau
  TV: 0.01, // Tuvalu
  NR: 0.01, // Nauru
  VA: 0.001, // Vatican City

  // Default population for countries not in the list (use with caution)
  XX: 1.0, // Default value (reduced from 5.0)
};

// Helper function to get population with fallback
export function getCountryPopulation(countryCode: string): number {
  if (!countryCode) return 1;

  // Normalize to uppercase and get first 2 characters (ISO2 code)
  const normalizedCode = countryCode.slice(0, 2).toUpperCase();

  // Use 1 million as default if country not found or has 0 pop
  const population = countryPopulations[normalizedCode] || countryPopulations.XX || 1;
  return Math.max(population, 0.001); // Ensure a minimum population to avoid division by zero
}
