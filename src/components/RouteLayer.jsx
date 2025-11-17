// src/components/RouteLayer.jsx
import { Source, Layer } from "react-map-gl/maplibre";

export default function RouteLayer({ routeData }) {
  const lineFeatures =
    (routeData.route_polylines || []).map((segment, idx) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: (segment.polyline || []).map((pt) => [pt.lon, pt.lat]),
      },
      properties: {
        id: `${routeData.route}-${segment.direction}-${idx}`,
        direction: segment.direction,
      },
    })) || [];

  const vehicleFeatures =
    (routeData.vehicles || []).map((v, idx) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Number(v.lon), Number(v.lat)],
      },
      properties: {
        id: v.vehicle_id || idx,
        destination: v.destination,
        occupancy: v.occupancy,
      },
    })) || [];

  const routeKey = routeData.route || "route";

  return (
    <>
      <Source
        id={`route-lines-${routeKey}`}
        type="geojson"
        data={{
          type: "FeatureCollection",
          features: lineFeatures,
        }}
      >
        <Layer
          id={`route-line-layer-${routeKey}`}
          type="line"
          paint={{
            "line-color": "#111111",
            "line-width": 3,
          }}
        />
      </Source>

      <Source
        id={`route-vehicles-${routeKey}`}
        type="geojson"
        data={{
          type: "FeatureCollection",
          features: vehicleFeatures,
        }}
      >
        <Layer
          id={`route-vehicle-layer-${routeKey}`}
          type="circle"
          paint={{
            "circle-radius": 5,
            "circle-color": "#e11d48",
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
          }}
        />
      </Source>
    </>
  );
}
