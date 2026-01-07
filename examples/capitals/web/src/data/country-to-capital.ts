// Map of country names (and common variations) to their capital cities
// This is used to determine the initial capital based on userLocation.country

export const countryToCapital: Record<string, string> = {
  // A
  Afghanistan: "Kabul",
  Albania: "Tirana",
  Algeria: "Algiers",
  Andorra: "Andorra la Vella",
  Angola: "Luanda",
  "Antigua and Barbuda": "Saint John's",
  Argentina: "Buenos Aires",
  Armenia: "Yerevan",
  Australia: "Canberra",
  Austria: "Vienna",
  Azerbaijan: "Baku",

  // B
  Bahamas: "Nassau",
  Bahrain: "Manama",
  Bangladesh: "Dhaka",
  Barbados: "Bridgetown",
  Belarus: "Minsk",
  Belgium: "Brussels",
  Belize: "Belmopan",
  Benin: "Porto-Novo",
  Bhutan: "Thimphu",
  Bolivia: "Sucre",
  "Bosnia and Herzegovina": "Sarajevo",
  Botswana: "Gaborone",
  Brazil: "Brasília",
  Brunei: "Bandar Seri Begawan",
  Bulgaria: "Sofia",
  "Burkina Faso": "Ouagadougou",
  Burundi: "Gitega",

  // C
  Cambodia: "Phnom Penh",
  Cameroon: "Yaoundé",
  Canada: "Ottawa",
  "Cape Verde": "Praia",
  "Central African Republic": "Bangui",
  Chad: "N'Djamena",
  Chile: "Santiago",
  China: "Beijing",
  Colombia: "Bogotá",
  Comoros: "Moroni",
  Congo: "Brazzaville",
  "Democratic Republic of the Congo": "Kinshasa",
  "Costa Rica": "San José",
  Croatia: "Zagreb",
  Cuba: "Havana",
  Cyprus: "Nicosia",
  "Czech Republic": "Prague",
  Czechia: "Prague",

  // D
  Denmark: "Copenhagen",
  Djibouti: "Djibouti",
  Dominica: "Roseau",
  "Dominican Republic": "Santo Domingo",

  // E
  Ecuador: "Quito",
  Egypt: "Cairo",
  "El Salvador": "San Salvador",
  "Equatorial Guinea": "Malabo",
  Eritrea: "Asmara",
  Estonia: "Tallinn",
  Eswatini: "Mbabane",
  Ethiopia: "Addis Ababa",

  // F
  Fiji: "Suva",
  Finland: "Helsinki",
  France: "Paris",

  // G
  Gabon: "Libreville",
  Gambia: "Banjul",
  Georgia: "Tbilisi",
  Germany: "Berlin",
  Ghana: "Accra",
  Greece: "Athens",
  Grenada: "Saint George's",
  Guatemala: "Guatemala City",
  Guinea: "Conakry",
  "Guinea-Bissau": "Bissau",
  Guyana: "Georgetown",

  // H
  Haiti: "Port-au-Prince",
  Honduras: "Tegucigalpa",
  Hungary: "Budapest",

  // I
  Iceland: "Reykjavik",
  India: "New Delhi",
  Indonesia: "Jakarta",
  Iran: "Tehran",
  Iraq: "Baghdad",
  Ireland: "Dublin",
  Israel: "Jerusalem",
  Italy: "Rome",
  "Ivory Coast": "Yamoussoukro",
  "Côte d'Ivoire": "Yamoussoukro",

  // J
  Jamaica: "Kingston",
  Japan: "Tokyo",
  Jordan: "Amman",

  // K
  Kazakhstan: "Astana",
  Kenya: "Nairobi",
  Kiribati: "Tarawa",
  "North Korea": "Pyongyang",
  "South Korea": "Seoul",
  Korea: "Seoul",
  Kuwait: "Kuwait City",
  Kyrgyzstan: "Bishkek",

  // L
  Laos: "Vientiane",
  Latvia: "Riga",
  Lebanon: "Beirut",
  Lesotho: "Maseru",
  Liberia: "Monrovia",
  Libya: "Tripoli",
  Liechtenstein: "Vaduz",
  Lithuania: "Vilnius",
  Luxembourg: "Luxembourg",

  // M
  Madagascar: "Antananarivo",
  Malawi: "Lilongwe",
  Malaysia: "Kuala Lumpur",
  Maldives: "Malé",
  Mali: "Bamako",
  Malta: "Valletta",
  "Marshall Islands": "Majuro",
  Mauritania: "Nouakchott",
  Mauritius: "Port Louis",
  Mexico: "Mexico City",
  Micronesia: "Palikir",
  Moldova: "Chișinău",
  Monaco: "Monaco",
  Mongolia: "Ulaanbaatar",
  Montenegro: "Podgorica",
  Morocco: "Rabat",
  Mozambique: "Maputo",
  Myanmar: "Naypyidaw",
  Burma: "Naypyidaw",

  // N
  Namibia: "Windhoek",
  Nauru: "Yaren",
  Nepal: "Kathmandu",
  Netherlands: "Amsterdam",
  "New Zealand": "Wellington",
  Nicaragua: "Managua",
  Niger: "Niamey",
  Nigeria: "Abuja",
  "North Macedonia": "Skopje",
  Norway: "Oslo",

  // O
  Oman: "Muscat",

  // P
  Pakistan: "Islamabad",
  Palau: "Ngerulmud",
  Palestine: "Ramallah",
  Panama: "Panama City",
  "Papua New Guinea": "Port Moresby",
  Paraguay: "Asunción",
  Peru: "Lima",
  Philippines: "Manila",
  Poland: "Warsaw",
  Portugal: "Lisbon",

  // Q
  Qatar: "Doha",

  // R
  Romania: "Bucharest",
  Russia: "Moscow",
  "Russian Federation": "Moscow",
  Rwanda: "Kigali",

  // S
  "Saint Kitts and Nevis": "Basseterre",
  "Saint Lucia": "Castries",
  "Saint Vincent and the Grenadines": "Kingstown",
  Samoa: "Apia",
  "San Marino": "San Marino",
  "São Tomé and Príncipe": "São Tomé",
  "Saudi Arabia": "Riyadh",
  Senegal: "Dakar",
  Serbia: "Belgrade",
  Seychelles: "Victoria",
  "Sierra Leone": "Freetown",
  Singapore: "Singapore",
  Slovakia: "Bratislava",
  Slovenia: "Ljubljana",
  "Solomon Islands": "Honiara",
  Somalia: "Mogadishu",
  "South Africa": "Pretoria",
  "South Sudan": "Juba",
  Spain: "Madrid",
  "Sri Lanka": "Sri Jayawardenepura Kotte",
  Sudan: "Khartoum",
  Suriname: "Paramaribo",
  Sweden: "Stockholm",
  Switzerland: "Bern",
  Syria: "Damascus",

  // T
  Taiwan: "Taipei",
  Tajikistan: "Dushanbe",
  Tanzania: "Dodoma",
  Thailand: "Bangkok",
  "Timor-Leste": "Dili",
  "East Timor": "Dili",
  Togo: "Lomé",
  Tonga: "Nukuʻalofa",
  "Trinidad and Tobago": "Port of Spain",
  Tunisia: "Tunis",
  Turkey: "Ankara",
  Türkiye: "Ankara",
  Turkmenistan: "Ashgabat",
  Tuvalu: "Funafuti",

  // U
  Uganda: "Kampala",
  Ukraine: "Kyiv",
  "United Arab Emirates": "Abu Dhabi",
  UAE: "Abu Dhabi",
  "United Kingdom": "London",
  UK: "London",
  "United States": "Washington",
  "United States of America": "Washington",
  USA: "Washington",
  US: "Washington",
  Uruguay: "Montevideo",
  Uzbekistan: "Tashkent",

  // V
  Vanuatu: "Port Vila",
  "Vatican City": "Vatican City",
  Venezuela: "Caracas",
  Vietnam: "Hanoi",
  "Viet Nam": "Hanoi",

  // Y
  Yemen: "Sana'a",

  // Z
  Zambia: "Lusaka",
  Zimbabwe: "Harare",
};

export function getCapitalForCountry(country: string): string | null {
  // Direct lookup
  if (countryToCapital[country]) {
    return countryToCapital[country];
  }

  // Case-insensitive lookup
  const normalizedCountry = country.toLowerCase();
  for (const [key, value] of Object.entries(countryToCapital)) {
    if (key.toLowerCase() === normalizedCountry) {
      return value;
    }
  }

  return null;
}

// Default capital if user location is not available
export const DEFAULT_CAPITAL = "Paris";
