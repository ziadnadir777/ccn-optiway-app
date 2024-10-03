import React, { useState } from 'react';
import TrafficLight from './TrafficLight';
import MapComponent from './MapComponent'; 
import './App.css';

function App() {
  const [showMap, setShowMap] = useState(false);

  const handleButtonClick = () => {
    setShowMap(true);
    
  };

  return (
    <div className="App">
      {!showMap ? (
        <div className="welcome-screen">
          <TrafficLight onWelcomeClick={handleButtonClick} />
        </div>
      ) : (
        <MapComponent />
      )}
    </div>
  );
}
export default App;
