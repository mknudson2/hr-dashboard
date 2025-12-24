import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCoordinates, getRandomOffset } from '../utils/geocoding';

interface LocationMapProps {
  locationData: {
    total_employees: number;
    us_states: Record<string, { count: number; cities: Record<string, number> }>;
    countries: Record<string, { count: number; cities: Record<string, number> }>;
    cities: Array<{
      city: string;
      state?: string;
      country?: string;
      full_location: string;
      type: string;
    }>;
  };
}

interface MarkerData {
  position: LatLngExpression;
  count: number;
  location: string;
  type: 'us' | 'international';
}

// Component to fit bounds to all markers
function FitBounds({ markers }: { markers: MarkerData[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      const bounds = markers.map(m => m.position as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
    }
  }, [markers, map]);

  return null;
}

const LocationMap = ({ locationData }: LocationMapProps) => {
  const [markers, setMarkers] = useState<MarkerData[]>([]);

  useEffect(() => {
    const newMarkers: MarkerData[] = [];

    // Add US state markers
    Object.entries(locationData.us_states).forEach(([state, data]) => {
      const coords = getCoordinates(state);
      if (coords) {
        newMarkers.push({
          position: [coords.lat, coords.lng],
          count: data.count,
          location: state,
          type: 'us'
        });
      }
    });

    // Add international country markers
    Object.entries(locationData.countries).forEach(([country, data]) => {
      const coords = getCoordinates(country);
      if (coords) {
        newMarkers.push({
          position: [coords.lat, coords.lng],
          count: data.count,
          location: country,
          type: 'international'
        });
      }
    });

    // Add city-level markers if available
    locationData.cities?.forEach((city, index) => {
      const coords = getCoordinates(city.full_location);
      if (coords) {
        // Add slight offset if multiple markers at same location
        const offset = getRandomOffset(index);
        newMarkers.push({
          position: [coords.lat + offset.latOffset, coords.lng + offset.lngOffset],
          count: 1,
          location: city.full_location,
          type: city.type === 'us' ? 'us' : 'international'
        });
      }
    });

    setMarkers(newMarkers);
  }, [locationData]);

  // Default center (US center)
  const defaultCenter: LatLngExpression = [39.8283, -98.5795];

  // Calculate marker size based on employee count
  const getMarkerSize = (count: number) => {
    const maxCount = Math.max(...markers.map(m => m.count));
    const minSize = 8;
    const maxSize = 30;
    return minSize + (count / maxCount) * (maxSize - minSize);
  };

  // Get marker color based on type
  const getMarkerColor = (type: 'us' | 'international') => {
    return type === 'us' ? '#3B82F6' : '#10B981'; // Blue for US, Green for International
  };

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapContainer
        center={defaultCenter}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.map((marker, index) => (
          <CircleMarker
            key={index}
            center={marker.position}
            radius={getMarkerSize(marker.count)}
            fillColor={getMarkerColor(marker.type)}
            color="#ffffff"
            weight={2}
            opacity={0.9}
            fillOpacity={0.6}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-gray-900">{marker.location}</p>
                <p className="text-gray-600">
                  {marker.count} {marker.count === 1 ? 'employee' : 'employees'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {marker.type === 'us' ? 'United States' : 'International'}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        <FitBounds markers={markers} />
      </MapContainer>
    </div>
  );
};

export default LocationMap;
