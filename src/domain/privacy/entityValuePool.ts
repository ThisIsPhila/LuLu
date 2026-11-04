export const entityValuePool = {
  Person: [
    'Sipho', 'Naledi', 'Zanele', 'Thabo', 'Lerato', 'Mandla', 'Nomsa', 'Palesa', 'Bongani', 'Ayanda',
    'Mpho', 'Dineo', 'Tshepo', 'Refilwe', 'Kgomotso', 'Lesedi', 'Neo', 'Karabo', 'Boitumelo',
    'Thandiwe', 'Busisiwe', 'Katlego', 'Omphemetse', 'Amogelang', 'Kutloano', 'Tlholohelo', 'Reabetswe',
    'Oratile', 'Kamohelo', 'Tumelo', 'Kagiso', 'Keitumetse', 'Lebo', 'Dikeledi', 'Nthabiseng', 'Tebogo',
    'Amantle', 'Goitsemang', 'Keneilwe', 'Molebogeng', 'Olebogeng', 'Oarabile', 'Oaitse', 'Ontlametse',
    'Mphoentle', 'Karaboentle', 'Refiloe', 'Tshiamo', 'Kgothatso', 'Kitso', 'Kgosi', 'Kgopotso',
    'Motsamai', 'Moshe', 'Tuelo', 'Ntebo', 'Kelebogile', 'Leruo', 'Tshepiso', 'Kabelo', 'Kamo',
    'Mpho', 'Patience', 'Grace', 'Faith', 'Hope', 'Joy', 'Peace', 'Mercy', 'Blessing', 'Precious',
    'David', 'Sarah', 'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Elizabeth', 'Richard', 'Barbara', 'Thomas', 'Susan', 'Charles', 'Jessica', 'Daniel', 'Amanda'
  ],
  Place: [
    'Maboneng', 'Soweto', 'Mamelodi', 'Rosebank', 'Sandton', 'Tembisa', 'Atteridgeville', 'Pretoria',
    'Johannesburg', 'Midrand', 'Centurion', 'the Nest', 'Blue Moon', 'Cape Town', 'Durban', 'Port Elizabeth',
    'Bloemfontein', 'Kimberley', 'Polokwane', 'Nelspruit', 'Mafikeng', 'Rustenburg', 'Vereeniging', 'Klerksdorp',
    'Upington', 'George', 'East London', 'Pietermaritzburg', 'Potchefstroom', 'Welkom', 'Ladysmith', 'Newcastle',
    'Uitenhage', 'Bisho', 'Mthatha', 'Queenstown', 'Grahamstown', 'Oudtshoorn', 'Knysna', 'Stellenbosch',
    'Paarl', 'Worcester', 'Swellendam', 'Ceres', 'Malmesbury', 'Somerset West', 'Strand', 'Grabouw',
    'Bellville', 'Parow', 'Goodwood', 'Athlone', 'Mitchells Plain', 'Khayelitsha', 'Nyanga', 'Gugulethu',
    'Lang', 'Hanover Park', 'Manenberg', 'Bonny', 'Hout Bay', 'Sea Point', 'Camps Bay', 'Constantia',
    'Newlands', 'Rondebosch', 'Claremont', 'Kenilworth', 'Wynberg', 'Plumstead', 'Diep River', 'Steenberg',
    'Lakeside', 'Muizenberg', 'Fish Hoek', 'Simonstown', 'Kommetjie', 'Scarborough', 'Ocean View', 'Masiphumelele'
  ],
  Organisation: [
    'Vukani Logistics', 'Khanya Admin', 'Motho Services', 'Thuso Clinic', 'Lerato Community Centre',
    'Naledi Outreach', 'Siyanda Holdings', 'Imbizo Trading', 'Ubuntu Solutions', 'Thabo’s Transport',
    'Mvelo Engineering', 'Khulani Construction', 'Zamani Retail', 'Thando Media', 'Sakhile Farming',
    'Kaya Communications', 'Langa Enterprises', 'Mpumi Consulting', 'Banele Imports', 'Nkosi Exports',
    'Thulani Supplies', 'Zenzele Distribution', 'Fundi Builders', 'Mnandi Catering', 'Velile Security',
    'Sizwe Insurance', 'Qhakaza Finance', 'Bhekumuzi Legal', 'Thamsanqa Accounting', 'Phumzile Real Estate',
    'Sibusiso Motors', 'Khaya Property', 'Nomzamo Cleaning', 'Mbali Events', 'Zola Travel',
    'African Safaris', 'Cape Tours', 'Garden Route Travel', 'Kruger Expeditions', 'Table Mountain Guides',
    'Winelands Tours', 'Soweto Tours', 'Apartheid Museum', 'Constitution Hill', 'Sterkfontein Caves',
    'Robben Island', 'Apartheid Heritage', 'Freedom Park', 'Mandela House', 'Hector Pieterson Museum',
    'University of Cape Town', 'University of Pretoria', 'Stellenbosch University', 'Wits University',
    'Rhodes University', 'UCT Medical School', 'Steve Biko Academic Hospital', 'Chris Hani Baragwanath Hospital',
    'Groote Schuur Hospital', 'Tygerberg Hospital', 'Red Cross War Memorial Children’s Hospital'
  ],
  Time: [
    'Blue Moon', 'Moonrise', 'Dusk', 'Twilight', 'Daybreak', 'Midnight', 'Dawn', 'Noon', 'Evening',
    'Morning', 'Afternoon', 'Night', 'Sunrise', 'Sunset', 'Midday', 'Midweek', 'Weekend', 'Weekday',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February',
    'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
    'Winter', 'Spring', 'Summer', 'Autumn', 'Rainy Season', 'Dry Season', 'Harvest Time', 'Planting Season',
    'New Year', 'Easter', 'Christmas', 'Heritage Day', 'Freedom Day', 'Workers Day', 'Youth Day',
    'Womens Day', 'Reconciliation Day', 'Christmas Eve', 'New Years Eve', 'Valentines Day', 'Mothers Day',
    'Fathers Day', 'Youth Sunday', 'Family Day', 'Public Holiday', 'School Holiday', 'Long Weekend'
  ]
} as const;

export type EntityPoolType = keyof typeof entityValuePool;

export function randomEntityValue(type: EntityPoolType, used: Set<string> = new Set()): string {
  const choices = entityValuePool[type].filter(value => !used.has(value));
  const pool = choices.length ? choices : [...entityValuePool[type]];
  return pool[Math.floor(Math.random() * pool.length)];
}
