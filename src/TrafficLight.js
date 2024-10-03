import React from 'react';
import './TrafficLight.css';
import logoImage from './optilogo.png';  // Replace with the actual path to your logo image
import appNameImage from './optiway.png';  // Replace with the actual path to your app name image

function TrafficLight({ onWelcomeClick }) {
  return (
    <div className="traffic-light-container">
      {/* Logo Image */}
      <img 
        src={logoImage} 
        alt="App Logo" 
        className="logo-image" 
      />

      {/* App Name Image */}
      <img 
        src={appNameImage} 
        alt="App Name" 
        className="app-name-image" 
      />

      {/* Welcome Button */}
      <button className="welcome-button" onClick={onWelcomeClick}>
        Welcome
        <span className="dynamic-cadre"></span>
      </button>
    </div>
  );
}

export default TrafficLight;
