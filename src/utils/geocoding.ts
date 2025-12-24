/**
 * Geocoding lookup tables for converting locations to coordinates
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

// US State Centers (approximate geographic centers)
export const US_STATE_COORDS: Record<string, Coordinates> = {
  "Alabama": { lat: 32.806671, lng: -86.791130 },
  "Alaska": { lat: 61.370716, lng: -152.404419 },
  "Arizona": { lat: 33.729759, lng: -111.431221 },
  "Arkansas": { lat: 34.969704, lng: -92.373123 },
  "California": { lat: 36.116203, lng: -119.681564 },
  "Colorado": { lat: 39.059811, lng: -105.311104 },
  "Connecticut": { lat: 41.597782, lng: -72.755371 },
  "Delaware": { lat: 39.318523, lng: -75.507141 },
  "Florida": { lat: 27.766279, lng: -81.686783 },
  "Georgia": { lat: 33.040619, lng: -83.643074 },
  "Hawaii": { lat: 21.094318, lng: -157.498337 },
  "Idaho": { lat: 44.240459, lng: -114.478828 },
  "Illinois": { lat: 40.349457, lng: -88.986137 },
  "Indiana": { lat: 39.849426, lng: -86.258278 },
  "Iowa": { lat: 42.011539, lng: -93.210526 },
  "Kansas": { lat: 38.526600, lng: -96.726486 },
  "Kentucky": { lat: 37.668140, lng: -84.670067 },
  "Louisiana": { lat: 31.169546, lng: -91.867805 },
  "Maine": { lat: 44.693947, lng: -69.381927 },
  "Maryland": { lat: 39.063946, lng: -76.802101 },
  "Massachusetts": { lat: 42.230171, lng: -71.530106 },
  "Michigan": { lat: 43.326618, lng: -84.536095 },
  "Minnesota": { lat: 45.694454, lng: -93.900192 },
  "Mississippi": { lat: 32.741646, lng: -89.678696 },
  "Missouri": { lat: 38.456085, lng: -92.288368 },
  "Montana": { lat: 46.921925, lng: -110.454353 },
  "Nebraska": { lat: 41.125370, lng: -98.268082 },
  "Nevada": { lat: 38.313515, lng: -117.055374 },
  "New Hampshire": { lat: 43.452492, lng: -71.563896 },
  "New Jersey": { lat: 40.298904, lng: -74.521011 },
  "New Mexico": { lat: 34.840515, lng: -106.248482 },
  "New York": { lat: 42.165726, lng: -74.948051 },
  "North Carolina": { lat: 35.630066, lng: -79.806419 },
  "North Dakota": { lat: 47.528912, lng: -99.784012 },
  "Ohio": { lat: 40.388783, lng: -82.764915 },
  "Oklahoma": { lat: 35.565342, lng: -96.928917 },
  "Oregon": { lat: 44.572021, lng: -122.070938 },
  "Pennsylvania": { lat: 40.590752, lng: -77.209755 },
  "Rhode Island": { lat: 41.680893, lng: -71.511780 },
  "South Carolina": { lat: 33.856892, lng: -80.945007 },
  "South Dakota": { lat: 44.299782, lng: -99.438828 },
  "Tennessee": { lat: 35.747845, lng: -86.692345 },
  "Texas": { lat: 31.054487, lng: -97.563461 },
  "Utah": { lat: 40.150032, lng: -111.862434 },
  "Vermont": { lat: 44.045876, lng: -72.710686 },
  "Virginia": { lat: 37.769337, lng: -78.169968 },
  "Washington": { lat: 47.400902, lng: -121.490494 },
  "West Virginia": { lat: 38.491226, lng: -80.954453 },
  "Wisconsin": { lat: 44.268543, lng: -89.616508 },
  "Wyoming": { lat: 42.755966, lng: -107.302490 }
};

// Country Centers (approximate geographic centers or capitals)
export const COUNTRY_COORDS: Record<string, Coordinates> = {
  "Canada": { lat: 56.130366, lng: -106.346771 },
  "United Kingdom": { lat: 55.378051, lng: -3.435973 },
  "Germany": { lat: 51.165691, lng: 10.451526 },
  "France": { lat: 46.227638, lng: 2.213749 },
  "Australia": { lat: -25.274398, lng: 133.775136 },
  "India": { lat: 20.593684, lng: 78.962880 },
  "Mexico": { lat: 23.634501, lng: -102.552784 },
  "Spain": { lat: 40.463667, lng: -3.749220 },
  "Netherlands": { lat: 52.132633, lng: 5.291266 },
  "Brazil": { lat: -14.235004, lng: -51.925280 },
  "Japan": { lat: 36.204824, lng: 138.252924 },
  "Italy": { lat: 41.871940, lng: 12.567380 },
  "South Korea": { lat: 35.907757, lng: 127.766922 },
  "China": { lat: 35.86166, lng: 104.195397 },
  "Singapore": { lat: 1.352083, lng: 103.819836 }
};

// City coordinates for major cities (subset - can be expanded)
export const CITY_COORDS: Record<string, Coordinates> = {
  // California
  "San Francisco, California": { lat: 37.7749, lng: -122.4194 },
  "Los Angeles, California": { lat: 34.0522, lng: -118.2437 },
  "San Diego, California": { lat: 32.7157, lng: -117.1611 },
  "Sacramento, California": { lat: 38.5816, lng: -121.4944 },

  // Texas
  "Austin, Texas": { lat: 30.2672, lng: -97.7431 },
  "Houston, Texas": { lat: 29.7604, lng: -95.3698 },
  "Dallas, Texas": { lat: 32.7767, lng: -96.7970 },
  "San Antonio, Texas": { lat: 29.4241, lng: -98.4936 },

  // New York
  "New York City, New York": { lat: 40.7128, lng: -74.0060 },
  "Buffalo, New York": { lat: 42.8864, lng: -78.8784 },
  "Rochester, New York": { lat: 43.1566, lng: -77.6088 },
  "Albany, New York": { lat: 42.6526, lng: -73.7562 },

  // Florida
  "Miami, Florida": { lat: 25.7617, lng: -80.1918 },
  "Tampa, Florida": { lat: 27.9506, lng: -82.4572 },
  "Orlando, Florida": { lat: 28.5383, lng: -81.3792 },
  "Jacksonville, Florida": { lat: 30.3322, lng: -81.6557 },

  // Washington
  "Seattle, Washington": { lat: 47.6062, lng: -122.3321 },
  "Spokane, Washington": { lat: 47.6588, lng: -117.4260 },
  "Tacoma, Washington": { lat: 47.2529, lng: -122.4443 },
  "Vancouver, Washington": { lat: 45.6387, lng: -122.6615 },

  // Colorado
  "Denver, Colorado": { lat: 39.7392, lng: -104.9903 },
  "Boulder, Colorado": { lat: 40.0150, lng: -105.2705 },
  "Colorado Springs, Colorado": { lat: 38.8339, lng: -104.8214 },
  "Fort Collins, Colorado": { lat: 40.5853, lng: -105.0844 },

  // Oregon
  "Portland, Oregon": { lat: 45.5152, lng: -122.6784 },
  "Eugene, Oregon": { lat: 44.0521, lng: -123.0868 },
  "Salem, Oregon": { lat: 44.9429, lng: -123.0351 },
  "Bend, Oregon": { lat: 44.0582, lng: -121.3153 },

  // Arizona
  "Phoenix, Arizona": { lat: 33.4484, lng: -112.0740 },
  "Tucson, Arizona": { lat: 32.2226, lng: -110.9747 },
  "Scottsdale, Arizona": { lat: 33.4942, lng: -111.9261 },
  "Mesa, Arizona": { lat: 33.4152, lng: -111.8315 },

  // Massachusetts
  "Boston, Massachusetts": { lat: 42.3601, lng: -71.0589 },
  "Cambridge, Massachusetts": { lat: 42.3736, lng: -71.1097 },
  "Worcester, Massachusetts": { lat: 42.2626, lng: -71.8023 },
  "Springfield, Massachusetts": { lat: 42.1015, lng: -72.5898 },

  // Illinois
  "Chicago, Illinois": { lat: 41.8781, lng: -87.6298 },
  "Aurora, Illinois": { lat: 41.7606, lng: -88.3201 },
  "Naperville, Illinois": { lat: 41.7508, lng: -88.1535 },
  "Peoria, Illinois": { lat: 40.6936, lng: -89.5890 },

  // Georgia
  "Atlanta, Georgia": { lat: 33.7490, lng: -84.3880 },
  "Savannah, Georgia": { lat: 32.0809, lng: -81.0912 },
  "Augusta, Georgia": { lat: 33.4735, lng: -82.0105 },
  "Columbus, Georgia": { lat: 32.4609, lng: -84.9877 },

  // North Carolina
  "Charlotte, North Carolina": { lat: 35.2271, lng: -80.8431 },
  "Raleigh, North Carolina": { lat: 35.7796, lng: -78.6382 },
  "Durham, North Carolina": { lat: 35.9940, lng: -78.8986 },
  "Greensboro, North Carolina": { lat: 36.0726, lng: -79.7920 },

  // Utah
  "Salt Lake City, Utah": { lat: 40.7608, lng: -111.8910 },
  "Provo, Utah": { lat: 40.2338, lng: -111.6585 },
  "Park City, Utah": { lat: 40.6461, lng: -111.4980 },
  "Ogden, Utah": { lat: 41.2230, lng: -111.9738 },

  // Nevada
  "Las Vegas, Nevada": { lat: 36.1699, lng: -115.1398 },
  "Reno, Nevada": { lat: 39.5296, lng: -119.8138 },
  "Henderson, Nevada": { lat: 36.0395, lng: -114.9817 },
  "Carson City, Nevada": { lat: 39.1638, lng: -119.7674 },

  // Pennsylvania
  "Philadelphia, Pennsylvania": { lat: 39.9526, lng: -75.1652 },
  "Pittsburgh, Pennsylvania": { lat: 40.4406, lng: -79.9959 },
  "Harrisburg, Pennsylvania": { lat: 40.2732, lng: -76.8867 },
  "Allentown, Pennsylvania": { lat: 40.6084, lng: -75.4902 },

  // International Cities
  "Toronto, Canada": { lat: 43.6532, lng: -79.3832 },
  "Vancouver, Canada": { lat: 49.2827, lng: -123.1207 },
  "Montreal, Canada": { lat: 45.5017, lng: -73.5673 },
  "Calgary, Canada": { lat: 51.0447, lng: -114.0719 },

  "London, United Kingdom": { lat: 51.5074, lng: -0.1278 },
  "Manchester, United Kingdom": { lat: 53.4808, lng: -2.2426 },
  "Edinburgh, United Kingdom": { lat: 55.9533, lng: -3.1883 },
  "Birmingham, United Kingdom": { lat: 52.4862, lng: -1.8904 },

  "Berlin, Germany": { lat: 52.5200, lng: 13.4050 },
  "Munich, Germany": { lat: 48.1351, lng: 11.5820 },
  "Hamburg, Germany": { lat: 53.5511, lng: 9.9937 },
  "Frankfurt, Germany": { lat: 50.1109, lng: 8.6821 },

  "Paris, France": { lat: 48.8566, lng: 2.3522 },
  "Lyon, France": { lat: 45.7640, lng: 4.8357 },
  "Marseille, France": { lat: 43.2965, lng: 5.3698 },
  "Toulouse, France": { lat: 43.6047, lng: 1.4442 },

  "Sydney, Australia": { lat: -33.8688, lng: 151.2093 },
  "Melbourne, Australia": { lat: -37.8136, lng: 144.9631 },
  "Brisbane, Australia": { lat: -27.4698, lng: 153.0251 },
  "Perth, Australia": { lat: -31.9505, lng: 115.8605 },

  "Bangalore, India": { lat: 12.9716, lng: 77.5946 },
  "Mumbai, India": { lat: 19.0760, lng: 72.8777 },
  "Delhi, India": { lat: 28.7041, lng: 77.1025 },
  "Hyderabad, India": { lat: 17.3850, lng: 78.4867 },

  "Mexico City, Mexico": { lat: 19.4326, lng: -99.1332 },
  "Guadalajara, Mexico": { lat: 20.6597, lng: -103.3496 },
  "Monterrey, Mexico": { lat: 25.6866, lng: -100.3161 },
  "Cancun, Mexico": { lat: 21.1619, lng: -86.8515 },

  "Madrid, Spain": { lat: 40.4168, lng: -3.7038 },
  "Barcelona, Spain": { lat: 41.3851, lng: 2.1734 },
  "Valencia, Spain": { lat: 39.4699, lng: -0.3763 },
  "Seville, Spain": { lat: 37.3891, lng: -5.9845 },

  "Amsterdam, Netherlands": { lat: 52.3676, lng: 4.9041 },
  "Rotterdam, Netherlands": { lat: 51.9225, lng: 4.47917 },
  "The Hague, Netherlands": { lat: 52.0705, lng: 4.3007 },
  "Utrecht, Netherlands": { lat: 52.0907, lng: 5.1214 },

  "São Paulo, Brazil": { lat: -23.5505, lng: -46.6333 },
  "Rio de Janeiro, Brazil": { lat: -22.9068, lng: -43.1729 },
  "Brasília, Brazil": { lat: -15.8267, lng: -47.9218 },
  "Salvador, Brazil": { lat: -12.9714, lng: -38.5014 }
};

/**
 * Get coordinates for a location string
 * Tries to match: city, state/country format first, then falls back to state/country
 */
export function getCoordinates(location: string): Coordinates | null {
  if (!location) return null;

  // Try exact city match first
  if (CITY_COORDS[location]) {
    return CITY_COORDS[location];
  }

  // Parse "City, State/Country" format
  if (location.includes(', ')) {
    const parts = location.split(', ');
    const stateOrCountry = parts[parts.length - 1].trim();

    // Try state
    if (US_STATE_COORDS[stateOrCountry]) {
      return US_STATE_COORDS[stateOrCountry];
    }

    // Try country
    if (COUNTRY_COORDS[stateOrCountry]) {
      return COUNTRY_COORDS[stateOrCountry];
    }
  }

  // Try as direct state lookup
  if (US_STATE_COORDS[location]) {
    return US_STATE_COORDS[location];
  }

  // Try as direct country lookup
  if (COUNTRY_COORDS[location]) {
    return COUNTRY_COORDS[location];
  }

  return null;
}

/**
 * Get a random offset for clustering multiple employees in same location
 */
export function getRandomOffset(index: number): { latOffset: number; lngOffset: number } {
  const baseOffset = 0.5; // degrees
  const angle = (index * 137.5) % 360; // Golden angle for distribution
  const distance = Math.sqrt(index) * 0.1;

  return {
    latOffset: Math.cos(angle * Math.PI / 180) * distance * baseOffset,
    lngOffset: Math.sin(angle * Math.PI / 180) * distance * baseOffset
  };
}
