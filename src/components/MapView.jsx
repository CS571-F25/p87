// src/components/MapView.jsx
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

function MapView({ children }) {
  return (
    <div className="map-view-root">
      <Map
        initialViewState={{
          longitude: -89.4012,
          latitude: 43.0731,
          zoom: 16,
        }}
        minZoom={13}
        maxZoom={18}
        mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
        scrollZoom
        doubleClickZoom
        dragRotate={false}
        touchZoomRotate
      >
        {children}
      </Map>
    </div>
  );
}

export default MapView;
