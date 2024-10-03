import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, FeatureGroup, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { EditControl } from 'react-leaflet-draw';
import axios from 'axios';

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import './UserMap.css';

const redIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const blueIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  shadowSize: [41, 41],
});

function UserMap({ userLocation }) {
  const [markers, setMarkers] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [mapInstance, setMapInstance] = useState(null);
  const [polyline, setPolyline] = useState(null);

  useEffect(() => {
    if (userLocation) {
      const userMarker = {
        position: [userLocation.latitude, userLocation.longitude],
        id: 'user',
        icon: redIcon,
      };
      setMarkers((prev) => {
        const hasUserMarker = prev.some(marker => marker.id === 'user');
        return hasUserMarker ? prev : [...prev, userMarker];
      });
    }
  }, [userLocation]);

  function MapClickHandler() {
    useMapEvents({
      click: (event) => {
        const { lat, lng } = event.latlng;
        const newMarker = { position: [lat, lng], id: `marker-${new Date().getTime()}`, icon: blueIcon };
        setMarkers(prevMarkers => [...prevMarkers, newMarker]);
      },
    });
    return null;
  }

  const removeMarker = (markerId) => {
    setMarkers(prevMarkers => prevMarkers.filter(marker => marker.id !== markerId));
  };

  const handleCreated = (e) => {
    const { layer } = e;
    if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
      setPolygons(prev => [...prev, layer.getLatLngs()]);
    }
  };

  const handleDeleted = (e) => {
    const deletedLayers = e.layers;
    const deletedLatLngs = deletedLayers.getLayers()
      .filter(layer => layer instanceof L.Polygon || layer instanceof L.Polyline)
      .map(layer => layer.getLatLngs());

    setPolygons(prev => prev.filter(polygon => 
      !deletedLatLngs.some(deleted => latLngsEqual(deleted, polygon))
    ));
  };

  const latLngsEqual = (arr1, arr2) => {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((latLng, index) => 
      latLng.lat === arr2[index].lat && latLng.lng === arr2[index].lng
    );
  };

  const fetchRoute = useCallback(async (start, end) => {
    const startCoord = start.reverse().join(',');
    const endCoord = end.reverse().join(',');
    const osrmUrl = `https://route.ls.hereapi.com/routing/2.2/calculateroute.json`;

    try {
      const response = await axios.get(osrmUrl);
      const route = response.data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      
      const newPolyline = L.polyline(route, { color: 'blue', weight: 5 });
      newPolyline.addTo(mapInstance);
      setPolyline(newPolyline); // Save reference to the polyline 
    } catch (error) {
      console.error('Error fetching route from OSRM:', error);
    }
  }, [mapInstance]);

  useEffect(() => {
    // Clear existing polyline if it exists
    if (polyline) {
      mapInstance.removeLayer(polyline);
    }

    // Only add route when exactly two markers are present
    if (mapInstance && markers.length === 2) {
      const [start, end] = markers.map(marker => marker.position);
      fetchRoute(start, end);
    }
  }, [markers, mapInstance, fetchRoute, polyline]);

  return (
    <div className="map-container">
      <MapContainer
        center={userLocation ? [userLocation.latitude, userLocation.longitude] : [51.505, -0.09]}
        zoom={13}
        style={{ height: '100vh', width: '100%' }}
        whenCreated={setMapInstance}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        <MapClickHandler />

        <FeatureGroup>
          <EditControl
            position="topright"
            onCreated={handleCreated}
            onDeleted={handleDeleted}
            draw={{
              rectangle: true,
              circle: true,
              polygon: true,
              marker: false,
            }}
          />
          {polygons.map((polygon, index) => (
            <Polygon key={index} positions={polygon} />
          ))}
        </FeatureGroup>

        <MarkerClusterGroup>
          {markers.map((marker) => (
            <Marker key={marker.id} position={marker.position} icon={marker.icon} eventHandlers={{
              click: () => removeMarker(marker.id)
            }}>
              <Popup>
                {marker.id === 'user' ? 'You are here!' : 'Click marker to remove'}
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}

export default UserMap;
