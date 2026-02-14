import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  useMap, 
  Polyline, 
  CircleMarker 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  ArrowLeft, Search, MapPin, Navigation, Share2, 
  Layers, Map as MapIcon, Loader, Route as RouteIcon,
  Copy, Check
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './TravelMap.css';

// --- UTILS: Custom Icons ---
const createCustomIcon = (color = 'blue', size = 32) => {
  const colorMap = {
    red: '#e74c3c',    // Destination
    green: '#1a3c34',  // Origin (Deep Green)
    blue: '#3498DB',   // Search Result
    gold: '#d4a373',   // Saved Place
  };
  
  const iconColor = colorMap[color] || colorMap.blue;
  
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background-color: ${iconColor};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: ${size/2.5}px; 
        height: ${size/2.5}px; 
        background: white; 
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  });
};

// --- UTILS: Haversine Distance Formula ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d.toFixed(1);
};

const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

// --- COMPONENT: Map Controller (FlyTo) ---
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, {
        animate: true,
        duration: 2.0 // Smooth flight
      });
    }
  }, [center, zoom, map]);
  return null;
};

// --- MAIN COMPONENT ---
const TravelMap = () => {
  const navigate = useNavigate();
  
  // -- STATE --
  const [mapCenter, setMapCenter] = useState([30.3753, 69.3451]); // Pakistan
  const [zoomLevel, setZoomLevel] = useState(6);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [toast, setToast] = useState(null); // For Share notifications
  
  // Locations Data
  const [markers, setMarkers] = useState([
    { id: 1, name: 'Hunza Valley', type: 'destination', coordinates: { lat: 36.3167, lng: 74.6500 }, description: 'Beautiful valley in Gilgit-Baltistan' },
    { id: 2, name: 'Lahore', type: 'origin', coordinates: { lat: 31.5204, lng: 74.3587 }, description: 'Heart of Punjab' },
    { id: 3, name: 'Islamabad', type: 'saved', coordinates: { lat: 33.6844, lng: 73.0479 }, description: 'Capital City' }
  ]);
  
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const [routeInfo, setRouteInfo] = useState(null); // Stores distance info

  // -- HELPERS --
  const showToastMessage = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Check if we have both origin and destination to draw a line
  useEffect(() => {
    const origin = markers.find(m => m.type === 'origin');
    const dest = markers.find(m => m.type === 'destination');
    
    if (origin && dest) {
      const dist = calculateDistance(
        origin.coordinates.lat, origin.coordinates.lng,
        dest.coordinates.lat, dest.coordinates.lng
      );
      setRouteInfo({ distance: dist, origin: origin.name, dest: dest.name });
    } else {
      setRouteInfo(null);
    }
  }, [markers]);

  // -- HANDLERS --

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);

        setMapCenter([newLat, newLng]);
        setZoomLevel(12);

        const newMarker = {
          id: Date.now(),
          name: result.display_name.split(',')[0],
          type: 'search-result',
          coordinates: { lat: newLat, lng: newLng },
          description: result.display_name
        };

        setMarkers(prev => [...prev, newMarker]);
        setSelectedMarker(newMarker);
        setSearchQuery('');
      } else {
        showToastMessage('Location not found', 'error');
      }
    } catch (error) {
      showToastMessage('Network error', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const getMarkerIcon = (type) => {
    switch(type) {
      case 'origin': return createCustomIcon('green');
      case 'destination': return createCustomIcon('red');
      case 'saved': return createCustomIcon('gold');
      default: return createCustomIcon('blue');
    }
  };

  const setAsOrigin = (marker) => {
    // Reset old origin to saved, set new origin
    const updated = markers.map(m => {
      if (m.id === marker.id) return { ...m, type: 'origin' };
      if (m.type === 'origin') return { ...m, type: 'saved' };
      return m;
    });
    setMarkers(updated);
    setSelectedMarker({ ...marker, type: 'origin' });
    showToastMessage(`${marker.name} set as Origin`);
  };

  const setAsDestination = (marker) => {
    const updated = markers.map(m => {
      if (m.id === marker.id) return { ...m, type: 'destination' };
      if (m.type === 'destination') return { ...m, type: 'saved' };
      return m;
    });
    setMarkers(updated);
    setSelectedMarker({ ...marker, type: 'destination' });
    showToastMessage(`${marker.name} set as Destination`);
  };

  const handleShare = async (marker) => {
    if (!marker) return;
    const shareUrl = `https://maps.google.com/?q=${marker.coordinates.lat},${marker.coordinates.lng}`;
    const shareText = `Check out ${marker.name} on Travel Map!`;

    // Try Native Share
    if (navigator.share) {
      try {
        await navigator.share({
          title: marker.name,
          text: shareText,
          url: shareUrl
        });
        showToastMessage('Shared successfully!');
      } catch (err) {
        // Fallback if user cancels or fails
        fallbackCopy(shareUrl);
      }
    } else {
      // Fallback for Desktop
      fallbackCopy(shareUrl);
    }
  };

  const fallbackCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToastMessage('Link copied to clipboard!');
    }).catch(() => {
      showToastMessage('Failed to copy link', 'error');
    });
  };

  // Get path for Polyline
  const getRoutePositions = () => {
    const origin = markers.find(m => m.type === 'origin');
    const dest = markers.find(m => m.type === 'destination');
    if (origin && dest) {
      return [
        [origin.coordinates.lat, origin.coordinates.lng],
        [dest.coordinates.lat, dest.coordinates.lng]
      ];
    }
    return null;
  };

  return (
    <div className="tm-page">
      
      {/* 1. Header Overlay */}
      <div className="tm-header-overlay">
        <button onClick={() => navigate('/dashboard')} className="tm-back-btn">
          <ArrowLeft size={20} />
        </button>
        <div className="tm-title-box">
          <h1>Travel Map</h1>
          <p>Plan routes & explore</p>
        </div>
      </div>

      {/* 2. Toast Notification */}
      {toast && (
        <div className={`tm-toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={16} /> : <div className="tm-toast-dot" />}
          {toast.message}
        </div>
      )}

      {/* 3. The Map */}
      <div className="tm-map-container">
        <MapContainer 
          center={mapCenter} 
          zoom={zoomLevel} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          scrollWheelZoom={true}
          dragging={true}
        >
          <MapController center={mapCenter} zoom={zoomLevel} />
          
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Render Route Line */}
          {getRoutePositions() && (
            <Polyline 
              positions={getRoutePositions()} 
              pathOptions={{ color: '#d4a373', weight: 4, dashArray: '10, 10', opacity: 0.8 }} 
            />
          )}

          {/* Render Markers */}
          {markers.map(marker => (
            <React.Fragment key={marker.id}>
              <Marker 
                position={[marker.coordinates.lat, marker.coordinates.lng]}
                icon={getMarkerIcon(marker.type)}
                eventHandlers={{ click: () => setSelectedMarker(marker) }}
              >
                <Popup className="tm-popup"><strong>{marker.name}</strong></Popup>
              </Marker>
              
              {/* Add a subtle circle around origin/dest for emphasis */}
              {(marker.type === 'origin' || marker.type === 'destination') && (
                <CircleMarker 
                  center={[marker.coordinates.lat, marker.coordinates.lng]}
                  pathOptions={{ 
                    color: marker.type === 'origin' ? '#1a3c34' : '#e74c3c',
                    fillColor: marker.type === 'origin' ? '#1a3c34' : '#e74c3c',
                    fillOpacity: 0.2,
                    weight: 1
                  }}
                  radius={20}
                />
              )}
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {/* 4. Floating UI Layer */}
      <div className="tm-ui-layer">
        
        {/* LEFT PANEL: Search & Legend */}
        <div className="tm-panel-left">
          <form onSubmit={handleSearch} className="tm-search-box">
            {isSearching ? <Loader className="tm-search-icon tm-spin" size={18} /> : <Search className="tm-search-icon" size={18} />}
            <input 
              type="text" 
              placeholder="Search (e.g. Naran, Skardu)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching}
            />
          </form>

          {/* Distance Badge (Visible if route exists) */}
          {routeInfo && (
            <div className="tm-route-card">
              <div className="tm-route-header">
                <RouteIcon size={16} /> Active Route
              </div>
              <div className="tm-route-details">
                <div className="tm-rd-row">
                  <span className="tm-dot dot-green"></span> {routeInfo.origin}
                </div>
                <div className="tm-dash-line" />
                <div className="tm-rd-row">
                  <span className="tm-dot dot-red"></span> {routeInfo.dest}
                </div>
              </div>
              <div className="tm-route-dist">
                Total Distance: <strong>{routeInfo.distance} km</strong>
              </div>
            </div>
          )}

          <div className="tm-card tm-legend">
            <div className="tm-card-header" onClick={() => setShowLegend(!showLegend)}>
              <div className="tm-card-title"><Layers size={16} /> Legend</div>
              <span className="tm-toggle-text">{showLegend ? 'Hide' : 'Show'}</span>
            </div>
            
            {showLegend && (
              <div className="tm-legend-items">
                <div className="tm-legend-row"><span className="tm-dot dot-green"></span><span>Origin</span></div>
                <div className="tm-legend-row"><span className="tm-dot dot-red"></span><span>Destination</span></div>
                <div className="tm-legend-row"><span className="tm-dot dot-gold"></span><span>Saved Place</span></div>
                <div className="tm-legend-row"><span className="tm-dot dot-blue"></span><span>Search Result</span></div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Selected Marker Info */}
        {selectedMarker && (
          <div className="tm-panel-right">
            <div className="tm-card tm-info-card">
              <button className="tm-close-btn" onClick={() => setSelectedMarker(null)}>×</button>
              
              <div className="tm-info-header">
                <div className="tm-info-icon"><MapPin size={24} /></div>
                <div>
                  <h3>{selectedMarker.name}</h3>
                  <span className={`tm-badge badge-${selectedMarker.type}`}>{selectedMarker.type.replace('-', ' ')}</span>
                </div>
              </div>
              
              <div className="tm-info-body">
                <p>{selectedMarker.description}</p>
                <div className="tm-coords">
                  {selectedMarker.coordinates.lat.toFixed(4)}, {selectedMarker.coordinates.lng.toFixed(4)}
                </div>
              </div>

              <div className="tm-actions">
                <button onClick={() => setAsOrigin(selectedMarker)} className="tm-action-btn">
                  <Navigation size={14} /> Origin
                </button>
                <button onClick={() => setAsDestination(selectedMarker)} className="tm-action-btn">
                  <MapIcon size={14} /> Dest
                </button>
                <button onClick={() => handleShare(selectedMarker)} className="tm-action-btn outline">
                  <Share2 size={14} /> Share
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelMap;