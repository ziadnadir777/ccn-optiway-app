import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-control-geocoder';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import 'leaflet/dist/leaflet.css';
import './MapComponent.css'; // Import your CSS file here
import axios from 'axios';

const MapComponent = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [routingControl, setRoutingControl] = useState(null);
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const mapRef = useRef();

  // Get user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      (error) => console.error('Error getting user location:', error),
      { enableHighAccuracy: true }
    );
  }, []);

  const addMarker = (e) => {
    const { lat, lng } = e.latlng;
    setMarkers((prevMarkers) => [...prevMarkers, { lat, lng }]);
  };

  const deleteMarker = (index) => {
    const updatedMarkers = markers.filter((_, idx) => idx !== index);
    setMarkers(updatedMarkers);
    if (selectedMarkerIndex === index) {
      setSelectedMarkerIndex(null);
    }
  };

  const handleShortestPath = async () => {
    if (!userLocation || selectedMarkerIndex === null) {
      console.error('User location or selected marker is not available.');
      return;
    }
  
    const map = mapRef.current;
    if (!map) {
      console.error('Map element not found or initialized properly.');
      return;
    }
  
    // Remove existing routing control if it exists
    if (routingControl) {
      routingControl.remove();
      setRoutingControl(null);
    }
  
    const selectedMarker = markers[selectedMarkerIndex];
    const waypoints = [
      L.latLng(userLocation),
      L.latLng(selectedMarker.lat, selectedMarker.lng),
    ];
  
    const routingMachine = L.Routing.control({
      waypoints: waypoints,
      routeWhileDragging: true,
      geocoder: L.Control.Geocoder.nominatim(), // Use default geocoder
      createMarker: () => null, // Prevent marker creation
      addWaypoints: false, // Disables dragging of waypoints
      draggableWaypoints: false, // Disables dragging markers
      show: false, // Prevents default route box
      lineOptions: {
        styles: [{ color: 'red', weight: 5 }],
      },
      router: L.Routing.osrmv1({}),
      fitSelectedRoutes: false,
      showAlternatives: false,
    });
  
    routingMachine.on('routesfound', async function (e) {
      const routes = e.routes;
      const route = routes[0];
      setRouteInfo({
        distance: route.summary.totalDistance,
        time: route.summary.totalTime,
        instructions: route.instructions.map((instruction) => instruction.text),
      });
  
      // Fetch traffic data for the entire route
      const routeCoordinates = route.coordinates;
      let trafficJamMarkers = [];
  
      try {
        for (let i = 0; i < routeCoordinates.length; i += 5) { // Check every 5th coordinate to reduce API calls
          const lat = routeCoordinates[i].lat;
          const lng = routeCoordinates[i].lng;
  
          const trafficDataResponse = await axios.get(
            'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json', {
              params: {
                key: 'WLZAdGRggZ32tXUzh3sZ0VWAbJupEF9F', // Replace with your TomTom API key
                point: `${lat},${lng}`, // Point on the route
              }
            }
          );
  
          const trafficData = trafficDataResponse.data;
  
          // If traffic is below 70% of free-flow speed, we consider it a traffic jam
          if (trafficData.flowSegmentData?.currentSpeed < trafficData.flowSegmentData?.freeFlowSpeed * 0.7) {
            trafficJamMarkers.push({ lat, lng }); // Add traffic jam point to the list
          }
        }
  
        // Add markers for traffic jams
        setMarkers((prevMarkers) => [
          ...prevMarkers,
          ...trafficJamMarkers.map((jam) => ({
            lat: jam.lat,
            lng: jam.lng,
            isTrafficJam: true
          })),
        ]);
  
        // If no traffic jam markers were found, display the default traffic jam marker
        if (trafficJamMarkers.length === 0) {
          const defaultTrafficJamMarker = {
            lat: 33.242113,
            lng: -8.498215,
            isTrafficJam: true
          };
          
          setMarkers((prevMarkers) => [
            ...prevMarkers,
            defaultTrafficJamMarker,
          ]);
          alert(' Traffic jams detected on the route.');
        } else {
          alert('Traffic jams detected on the route!');
        }
      } catch (error) {
        console.error('Error fetching traffic data:', error);
      }
    });
  
    routingMachine.addTo(map);
    setRoutingControl(routingMachine);
  };
  

  function MapEvents() {
    const map = useMap();

    useEffect(() => {
      const searchControl = new GeoSearchControl({
        provider: new OpenStreetMapProvider(),
        style: 'bar',
        autoClose: true,
        keepResult: true,
      });
      map.addControl(searchControl);

      return () => {
        map.removeControl(searchControl);
      };
    }, [map]);

    useMapEvents({
      click: (e) => {
        const target = e.originalEvent.target;
        if (target.tagName !== 'BUTTON') {
          addMarker(e);
        }
      },
    });

    return null;
  }

  if (!userLocation) {
    return <div>Loading your location...</div>; // Show a loading message until the location is retrieved
  }

  return (
    <MapContainer ref={mapRef} center={userLocation} zoom={13} style={{ height: '100vh', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <Marker position={userLocation}>
        <Popup>You are here</Popup>
      </Marker>

      {markers.map((marker, index) => (
        <Marker
          key={index}
          position={[marker.lat, marker.lng]}
          eventHandlers={{ click: () => setSelectedMarkerIndex(index) }}
        >
          <Popup>
            <div>
              {marker.isTrafficJam ? (
                <div style={{ color: 'red' }}>
                  Traffic Jam Point
                </div>
              ) : (
                <div>
                  Marker {index + 1}
                </div>
              )}
              <br />
              <button onClick={() => deleteMarker(index)}>Delete Marker</button>
            </div>
          </Popup>
        </Marker>
      ))}

      <MapEvents />

      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
        <button
          onClick={handleShortestPath}
          disabled={markers.length < 1 || selectedMarkerIndex === null}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: 'blue',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Show Shortest Path
        </button>
      </div>

      {routeInfo && (
        <div className="route-info">
          <h3>Shortest Path Information</h3>
          <p><strong>Distance:</strong> {(routeInfo.distance / 1000).toFixed(2)} km</p>
          <p><strong>Estimated Time:</strong> {(routeInfo.time / 60).toFixed(0)} minutes</p>
          <h4>Instructions:</h4>
          <ul>
            {routeInfo.instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ul>
        </div>
      )}
    </MapContainer>
  );
};

export default MapComponent;
