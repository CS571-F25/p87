// src/components/MapPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import MapView from "./MapView";         // MapView is in the same folder
import StopMarkers from "./StopMarkers";
import BusLayer from "./BusLayer";
import RouteLayer from "./RouteLayer";
import { loadStops } from "../utils/loadStops";

function MapPage() {
  const { routeId } = useParams(); // /map, /map/B, /map/80, etc.
  const [stops, setStops] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);

  // Load stops like before
  useEffect(() => {
    loadStops().then(setStops);
  }, []);

  // Fetch route details when routeId is present
  useEffect(() => {
    if (!routeId) {
      setRouteData(null);
      return;
    }

    setRouteLoading(true);
    setRouteError(null);

    fetch(
      `https://badger-transit-dawn-darkness-55.fly.dev/api/routes/${routeId}`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load route ${routeId}`);
        }
        return res.json();
      })
      .then((data) => {
        setRouteData(data);
      })
      .catch((err) => {
        console.error(err);
        setRouteError(err.message || "Error loading route");
      })
      .finally(() => {
        setRouteLoading(false);
      });
  }, [routeId]);

  return (
    <>
      {routeLoading && routeId && (
        <div className="map-overlay">Loading route {routeId}…</div>
      )}
      {routeError && (
        <div className="map-overlay map-overlay-error">{routeError}</div>
      )}

      <MapView>
        <StopMarkers stops={stops} />
        <BusLayer stopId="0626" />
        {routeData && <RouteLayer routeData={routeData} />}
      </MapView>
    </>
  );
}

export default MapPage;
