/**
 * Nigeria States and Major Cities Data
 * Save as: frontend/src/data/locations.js (NEW FILE)
 */

export const NIGERIA_STATES = [
  { value: 'Abia', label: 'Abia' },
  { value: 'Adamawa', label: 'Adamawa' },
  { value: 'Akwa Ibom', label: 'Akwa Ibom' },
  { value: 'Anambra', label: 'Anambra' },
  { value: 'Bauchi', label: 'Bauchi' },
  { value: 'Bayelsa', label: 'Bayelsa' },
  { value: 'Benue', label: 'Benue' },
  { value: 'Borno', label: 'Borno' },
  { value: 'Cross River', label: 'Cross River' },
  { value: 'Delta', label: 'Delta' },
  { value: 'Ebonyi', label: 'Ebonyi' },
  { value: 'Edo', label: 'Edo' },
  { value: 'Ekiti', label: 'Ekiti' },
  { value: 'Enugu', label: 'Enugu' },
  { value: 'FCT', label: 'FCT (Abuja)' },
  { value: 'Gombe', label: 'Gombe' },
  { value: 'Imo', label: 'Imo' },
  { value: 'Jigawa', label: 'Jigawa' },
  { value: 'Kaduna', label: 'Kaduna' },
  { value: 'Kano', label: 'Kano' },
  { value: 'Katsina', label: 'Katsina' },
  { value: 'Kebbi', label: 'Kebbi' },
  { value: 'Kogi', label: 'Kogi' },
  { value: 'Kwara', label: 'Kwara' },
  { value: 'Lagos', label: 'Lagos' },
  { value: 'Nasarawa', label: 'Nasarawa' },
  { value: 'Niger', label: 'Niger' },
  { value: 'Ogun', label: 'Ogun' },
  { value: 'Ondo', label: 'Ondo' },
  { value: 'Osun', label: 'Osun' },
  { value: 'Oyo', label: 'Oyo' },
  { value: 'Plateau', label: 'Plateau' },
  { value: 'Rivers', label: 'Rivers' },
  { value: 'Sokoto', label: 'Sokoto' },
  { value: 'Taraba', label: 'Taraba' },
  { value: 'Yobe', label: 'Yobe' },
  { value: 'Zamfara', label: 'Zamfara' },
];

// Major cities per state (for city dropdown based on selected state)
export const CITIES_BY_STATE = {
  'Lagos': ['Ikeja', 'Lekki', 'Victoria Island', 'Ikoyi', 'Surulere', 'Yaba', 'Apapa', 'Ajah', 'Epe', 'Badagry'],
  'FCT': ['Abuja', 'Gwagwalada', 'Kubwa', 'Kuje', 'Nyanya', 'Lugbe', 'Maitama', 'Asokoro', 'Wuse', 'Garki'],
  'Kano': ['Kano', 'Wudil', 'Gwarzo', 'Bichi', 'Rano'],
  'Rivers': ['Port Harcourt', 'Obio-Akpor', 'Bonny', 'Eleme', 'Okrika'],
  'Oyo': ['Ibadan', 'Oyo', 'Ogbomosho', 'Iseyin', 'Eruwa'],
  'Kaduna': ['Kaduna', 'Zaria', 'Kafanchan', 'Kagoro', 'Saminaka'],
  'Ogun': ['Abeokuta', 'Ijebu Ode', 'Sagamu', 'Ota', 'Ilaro'],
  'Anambra': ['Awka', 'Onitsha', 'Nnewi', 'Ekwulobia', 'Agulu'],
  'Delta': ['Asaba', 'Warri', 'Sapele', 'Ughelli', 'Agbor'],
  'Edo': ['Benin City', 'Auchi', 'Ekpoma', 'Uromi', 'Irrua'],
  'Enugu': ['Enugu', 'Nsukka', 'Oji River', 'Agbani', 'Ezeagu'],
  'Imo': ['Owerri', 'Orlu', 'Okigwe', 'Oguta', 'Mbaise'],
  'Abia': ['Umuahia', 'Aba', 'Arochukwu', 'Ohafia', 'Bende'],
  'Akwa Ibom': ['Uyo', 'Eket', 'Ikot Ekpene', 'Oron', 'Abak'],
  'Plateau': ['Jos', 'Bukuru', 'Pankshin', 'Shendam', 'Langtang'],
  'Kwara': ['Ilorin', 'Offa', 'Jebba', 'Lafiagi', 'Pategi'],
  'Benue': ['Makurdi', 'Gboko', 'Otukpo', 'Katsina-Ala', 'Vandeikya'],
  'Niger': ['Minna', 'Bida', 'Kontagora', 'Suleja', 'Lapai'],
  'Osun': ['Osogbo', 'Ile-Ife', 'Ilesha', 'Ede', 'Iwo'],
  'Ondo': ['Akure', 'Ondo', 'Owo', 'Ikare', 'Ore'],
  'Ekiti': ['Ado-Ekiti', 'Ikere', 'Ijero', 'Efon', 'Aramoko'],
  'Cross River': ['Calabar', 'Ikom', 'Ogoja', 'Obudu', 'Ugep'],
  'Bayelsa': ['Yenagoa', 'Brass', 'Nembe', 'Sagbama', 'Ogbia'],
  'Adamawa': ['Yola', 'Jimeta', 'Mubi', 'Numan', 'Ganye'],
  'Bauchi': ['Bauchi', 'Azare', 'Misau', 'Jama\'are', 'Katagum'],
  'Borno': ['Maiduguri', 'Biu', 'Bama', 'Konduga', 'Dikwa'],
  'Ebonyi': ['Abakaliki', 'Afikpo', 'Onueke', 'Ezza', 'Ikwo'],
  'Gombe': ['Gombe', 'Kumo', 'Billiri', 'Deba', 'Kaltungo'],
  'Jigawa': ['Dutse', 'Hadejia', 'Gumel', 'Kazaure', 'Ringim'],
  'Katsina': ['Katsina', 'Daura', 'Funtua', 'Malumfashi', 'Kankia'],
  'Kebbi': ['Birnin Kebbi', 'Argungu', 'Yauri', 'Zuru', 'Jega'],
  'Kogi': ['Lokoja', 'Okene', 'Kabba', 'Idah', 'Ankpa'],
  'Nasarawa': ['Lafia', 'Keffi', 'Akwanga', 'Nasarawa', 'Doma'],
  'Sokoto': ['Sokoto', 'Tambuwal', 'Gwadabawa', 'Wurno', 'Goronyo'],
  'Taraba': ['Jalingo', 'Wukari', 'Bali', 'Gembu', 'Ibi'],
  'Yobe': ['Damaturu', 'Potiskum', 'Gashua', 'Nguru', 'Geidam'],
  'Zamfara': ['Gusau', 'Kaura Namoda', 'Talata Mafara', 'Anka', 'Bungudu'],
};

// Helper function to get cities for a state
export function getCitiesForState(state) {
  return CITIES_BY_STATE[state] || [];
}

// Helper function to check if state has predefined cities
export function hasPreDefinedCities(state) {
  return state in CITIES_BY_STATE && CITIES_BY_STATE[state].length > 0;
}

// Nearby states mapping (for showing products from nearby areas)
export const NEARBY_STATES = {
  'Lagos': ['Ogun'],
  'Ogun': ['Lagos', 'Oyo', 'Ondo', 'Osun'],
  'FCT': ['Nasarawa', 'Niger', 'Kogi', 'Kaduna'],
  'Kano': ['Jigawa', 'Katsina', 'Kaduna', 'Bauchi'],
  'Rivers': ['Bayelsa', 'Delta', 'Abia', 'Imo', 'Akwa Ibom'],
  'Oyo': ['Ogun', 'Osun', 'Kwara'],
  'Kaduna': ['Kano', 'Katsina', 'Niger', 'FCT', 'Plateau'],
  'Anambra': ['Enugu', 'Delta', 'Imo', 'Kogi', 'Ebonyi'],
  'Delta': ['Edo', 'Rivers', 'Bayelsa', 'Anambra', 'Imo'],
  'Edo': ['Delta', 'Ondo', 'Kogi'],
  'Enugu': ['Anambra', 'Ebonyi', 'Abia', 'Benue', 'Kogi'],
  'Imo': ['Abia', 'Anambra', 'Rivers', 'Akwa Ibom'],
  'Abia': ['Imo', 'Akwa Ibom', 'Cross River', 'Ebonyi', 'Enugu', 'Rivers'],
  'Akwa Ibom': ['Cross River', 'Abia', 'Rivers', 'Imo'],
  'Plateau': ['Kaduna', 'Bauchi', 'Nasarawa', 'Taraba'],
  'Kwara': ['Niger', 'Kogi', 'Oyo', 'Ekiti'],
  'Benue': ['Nasarawa', 'Kogi', 'Enugu', 'Ebonyi', 'Cross River', 'Taraba'],
  'Niger': ['FCT', 'Kaduna', 'Kogi', 'Kwara', 'Kebbi', 'Zamfara'],
  'Osun': ['Oyo', 'Ogun', 'Ondo', 'Ekiti'],
  'Ondo': ['Ekiti', 'Osun', 'Ogun', 'Edo', 'Kogi'],
  'Ekiti': ['Ondo', 'Osun', 'Kogi', 'Kwara'],
  'Cross River': ['Akwa Ibom', 'Abia', 'Benue', 'Ebonyi'],
  'Bayelsa': ['Rivers', 'Delta'],
  'Adamawa': ['Taraba', 'Gombe', 'Borno'],
  'Bauchi': ['Gombe', 'Jigawa', 'Kaduna', 'Kano', 'Plateau', 'Taraba', 'Yobe'],
  'Borno': ['Adamawa', 'Gombe', 'Yobe'],
  'Ebonyi': ['Enugu', 'Abia', 'Cross River', 'Benue'],
  'Gombe': ['Bauchi', 'Borno', 'Adamawa', 'Taraba', 'Yobe'],
  'Jigawa': ['Kano', 'Katsina', 'Bauchi', 'Yobe'],
  'Katsina': ['Kano', 'Jigawa', 'Kaduna', 'Zamfara'],
  'Kebbi': ['Sokoto', 'Zamfara', 'Niger'],
  'Kogi': ['FCT', 'Niger', 'Kwara', 'Ekiti', 'Ondo', 'Edo', 'Anambra', 'Enugu', 'Benue', 'Nasarawa'],
  'Nasarawa': ['FCT', 'Plateau', 'Taraba', 'Benue', 'Kogi', 'Kaduna'],
  'Sokoto': ['Kebbi', 'Zamfara'],
  'Taraba': ['Adamawa', 'Plateau', 'Benue', 'Nasarawa', 'Gombe', 'Bauchi'],
  'Yobe': ['Borno', 'Gombe', 'Bauchi', 'Jigawa'],
  'Zamfara': ['Sokoto', 'Kebbi', 'Niger', 'Kaduna', 'Katsina'],
};

// Get nearby states for product filtering
export function getNearbyStates(state) {
  return NEARBY_STATES[state] || [];
}