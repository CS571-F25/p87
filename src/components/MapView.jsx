// src/components/MapView.jsx
import { useState, useRef } from "react";
import Map, { Marker } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

function MapView({
  children,
  onMapClick,
  onLoad,
  viewState,
  onMove,
}) {
  const mapRef = useRef(null);

  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const [snowEnabled, setSnowEnabled] = useState(true);

  const defaultInitialViewState = {
    longitude: -89.4012,
    latitude: 43.0731,
    zoom: 16,
  };

  // Helper to apply or remove snow effect
  const applySnow = (map, enabled) => {
    if (!map || typeof map.setSnow !== "function") {
      if (!map) return;
      console.warn("map.setSnow is not defined. Are you missing a plugin script?");
      return;
    }

    if (enabled) {
      map.setSnow({
        density: 0.85,
        intensity: 1,
        color: "#FFFFFF",
        opacity: 1,
        "center-thinning": 0.4,
        direction: [0, 50],
        "flake-size": 0.71,
        vignette: 0.3,
        vignetteColor: "#FFFFFF",
      });
    } else if (typeof map.removeSnow === "function") {
      // If the plugin supports removing snow explicitly
      map.removeSnow();
    } else {
      // Fallback: "turn off" snow by making it invisible
      map.setSnow({
        density: 0,
        intensity: 0,
        opacity: 0,
        "center-thinning": 0,
        direction: [0, 0],
        "flake-size": 0,
        vignette: 0,
        vignetteColor: "#FFFFFF",
      });
    }
  };

  // 1. Create a wrapper function to handle the map loading
  const handleMapLoad = (event) => {
    const map = event.target; // This is the native Mapbox GL JS map instance
    mapRef.current = map;

    // Apply snow effect based on current toggle state
    applySnow(map, snowEnabled);

    // 3. Call the parent onLoad function (so MapPage knows the map is ready)
    if (onLoad) {
      onLoad(event);
    }
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const loc = { latitude, longitude };

        setUserLocation(loc);
        setIsLocating(false);

        // Center map on user's location
        if (mapRef.current && typeof mapRef.current.flyTo === "function") {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 16,
            essential: true,
          });
        }
      },
      (error) => {
        setIsLocating(false);
        setLocationError(error.message || "Unable to retrieve your location.");
      }
    );
  };

  const handleToggleSnow = () => {
    const next = !snowEnabled;
    setSnowEnabled(next);

    if (mapRef.current) {
      applySnow(mapRef.current, next);
    }
  };

  return (
    <div
      className="map-view-root"
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      {/* Snow toggle + error (top-right) */}
      <div
        className="map-controls"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={handleToggleSnow}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            background: "#ffffff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          }}
        >
          {snowEnabled ? "Disable Snow" : "Enable Snow"}
        </button>

        {locationError && (
          <div
            style={{
              marginTop: 4,
              maxWidth: 160,
              fontSize: 10,
              background: "rgba(255,255,255,0.9)",
              padding: "4px 6px",
              borderRadius: 4,
            }}
          >
            {locationError}
          </div>
        )}
      </div>

      {/* My Location button (bottom-right) */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          zIndex: 1,
        }}
      >
        <button
          type="button"
          onClick={handleLocateUser}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            background: "#ffffff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          }}
        >
          {isLocating ? "Locating…" : "My Location"}
        </button>
      </div>

      <Map
        // If a controlled viewState is provided, use it; otherwise fall back to initialViewState
        {...(viewState ? { ...viewState } : {})}
        initialViewState={viewState ? undefined : defaultInitialViewState}
        minZoom={12.75}
        maxZoom={18}
        mapStyle="mapbox://styles/ben-hurwitz/cmixuervv003501rxg4mjgm6k"
        mapboxAccessToken="pk.eyJ1IjoiYmVuLWh1cndpdHoiLCJhIjoiY21oOGF0cjVjMDlzdDJscG9oemZpZ2J0ZSJ9.WDhxlwNRVnVxBlbDIgrppQ"
        scrollZoom
        doubleClickZoom
        dragRotate={false}
        touchZoomRotate
        onClick={onMapClick}
        onLoad={handleMapLoad}
        onMove={onMove}
        style={{ width: "100%", height: "100%" }}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            longitude={userLocation.longitude}
            latitude={userLocation.latitude}
            anchor="bottom"
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#3b82f6",
                border: "2px solid #ffffff",
                boxShadow: "0 0 0 2px rgba(59,130,246,0.5)",
              }}
            />
          </Marker>
        )}

        {children}
      </Map>
    </div>
  );
}

export default MapView;
