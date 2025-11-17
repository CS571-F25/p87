// src/components/MapView.jsx
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

function MapView({ children }) {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Map
        initialViewState={{
          longitude: -89.4012,
          latitude: 43.0731,
          zoom: 16,
        }}
        minZoom={13}
        maxZoom={18}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        scrollZoom={true}
        doubleClickZoom={true}
        dragRotate={false}
        touchZoomRotate={true}
      >
        {children}
      </Map>
    </div>
  );
}

export default MapView;
