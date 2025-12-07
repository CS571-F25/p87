// src/components/MapPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";

import MapView from "./MapView";
import StopMarkers from "./StopMarkers";
import BusLayer from "./BusLayer";
import RouteLayer from "./RouteLayer";
import { loadStops } from "../utils/loadStops";
import { loadSmartLaunchRules, saveSmartLaunchRules } from "../utils/smartLaunch";
import "../Home.css";
import "./Map.css";

import { Marker, Source, Layer } from "react-map-gl/maplibre";

/* ====== SHARED HELPERS FOR BUS CARD (MATCHING StopPage) ====== */

const ROUTE_COLORS = {
  A: "#FF0000",
  A1: "#FF0000",
  A2: "#FF0000",
  B: "#84BC00",
  F: "#0039AA",
  80: "#FF7300",
  81: "#00B7C8",
  82: "#BC009D",
  84: "#C1C800",
};

function getRouteColor(code) {
  return ROUTE_COLORS[code] || "#000000";
}

function formatArrivalTime(predicted_time) {
  if (!predicted_time) return "";
  const [, timePart] = predicted_time.split(" ");
  if (!timePart) return "";
  const [hourStr, minuteStr] = timePart.split(":");
  const d = new Date();
  d.setHours(Number(hourStr), Number(minuteStr), 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatStopsAway(pred) {
  if (pred.dyn === 4) {
    return "Drop offs only";
  }
  if (pred.stops_away != null) {
    const n = pred.stops_away;
    return `${n} stop${n === 1 ? "" : "s"} away`;
  }
  if (Array.isArray(pred.stops_between) && pred.stops_between.length > 0) {
    const n = pred.stops_between.length;
    return `${n} stop${n === 1 ? "" : "s"} away`;
  }
  if (pred.stops_away === 0) {
    return "Approaching Stop";
  }
  if (pred.eta_minutes <= 1) {
    return "At Stop";
  }
  if (pred.stops_away === null) {
    return "En Route";
  }
  return "Many Stops Away";
}

function getOccupancyDots(occupancy) {
  if (occupancy === "N/A") return 5;
  if (occupancy === "EMPTY") return 1;
  if (occupancy === "HALF_EMPTY") return 3;
  if (occupancy === "FULL") return 5;
  return 0;
}

/* ====== CARD USED ON MAP WHEN TRACKING A BUS ====== */

function TrackBusCard({ pred }) {
  const arrivalLabel = formatArrivalTime(pred.predicted_time);
  const stopsAwayText = formatStopsAway(pred);
  const occDots = getOccupancyDots(pred.occupancy || "");

  return (
    <article className="bus-card">
      <div
        className="bus-card-route"
        style={{ backgroundColor: getRouteColor(pred.route) }}
      >
        {pred.route}
      </div>

      <div className="bus-card-main">
        <div className="bus-card-left">
          {/* top row */}
          <div className="bus-card-top">
            <div className="bus-card-destination">{pred.destination}</div>
            <div className="bus-card-times">
              <div className="bus-card-eta">
                {pred.eta_minutes != null ? `${pred.eta_minutes} min` : "--"}
              </div>
            </div>
          </div>

          {/* second row */}
          <div className="bus-card-bottom">
            <div className="bus-card-occupancy">
              <div className="bus-card-dots">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={
                      "occ-dot" + (i < occDots ? " occ-dot-filled" : "")
                    }
                  />
                ))}
              </div>
              <span className="bus-card-sub">
                {stopsAwayText} • Tracking bus #{pred.vehicle_id}
              </span>
            </div>
            <div className="bus-card-clock">{arrivalLabel}</div>
          </div>
        </div>

        <div className="bus-card-right">
          <div className="bus-card-track bus-card-track--inactive">
            Tracking
          </div>
        </div>
      </div>
    </article>
  );
}

/* ====== SIMPLE CIRCLE POLYGON FOR SMARTLAUNCH ====== */

// approximate small circle on Earth in degrees (good enough for city radius)
function makeCircleFeature(lat, lon, radiusMeters, id, stopId, points = 64) {
  const coords = [];
  const R = 111320; // ~meters per degree latitude
  const dLat = radiusMeters / R;
  const dLonBase = radiusMeters / (R * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const newLat = lat + dy * dLat;
    const newLon = lon + dx * dLonBase;
    coords.push([newLon, newLat]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
    properties: {
      id,
      stopId,
    },
  };
}

/* ====== MAIN PAGE ====== */

function MapPage() {
  // /map/:routeId  OR  /map/:stopId/:vehicleId
  const { routeId, stopId, vehicleId } = useParams();
  const navigate = useNavigate();

  const isRouteMode = !!routeId && !vehicleId;
  const isTrackMode = !!stopId && !!vehicleId;

  const [stops, setStops] = useState([]);

  // Route mode state
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);

  // Track mode state
  const [trackPred, setTrackPred] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState(null);

  // SmartLaunch rules
  const [smartLaunchRules, setSmartLaunchRules] = useState([]);
  
  const [smartCenter, setSmartCenter] = useState(null);

  // Map view state (so we know the center for SmartLaunch)
  const [viewState, setViewState] = useState({
    longitude: -89.4012,
    latitude: 43.0731,
    zoom: 16,
  });

  // time + date (same as HomePage)
  const now = new Date();
  const timeString = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateString = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Load stops once
  useEffect(() => {
    loadStops()
      .then(setStops)
      .catch((err) => {
        console.error("Failed to load stops", err);
        setStops([]);
      });
  }, []);

  // Load SmartLaunch rules once
  useEffect(() => {
    setSmartLaunchRules(loadSmartLaunchRules());
  }, []);

  // ROUTE MODE: fetch route details when routeId is present
  useEffect(() => {
    if (!isRouteMode) {
      setRouteData(null);
      setRouteError(null);
      setRouteLoading(false);
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
  }, [isRouteMode, routeId]);

  // TRACK MODE: fetch single prediction for stopId + vehicleId
  useEffect(() => {
    if (!isTrackMode) {
      setTrackPred(null);
      setTrackError(null);
      setTrackLoading(false);
      return;
    }

    setTrackLoading(true);
    setTrackError(null);
    setTrackPred(null);

    fetch(
      `https://badger-transit-dawn-darkness-55.fly.dev/api/predictions/${stopId}`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load tracking info");
        }
        return res.json();
      })
      .then((json) => {
        const results = json.results || [];
        const match = results.find(
          (pred) => String(pred.vehicle_id) === String(vehicleId)
        );

        if (!match) {
          throw new Error("Bus not found at this stop (it may have departed)");
        }

        setTrackPred(match);
      })
      .catch((err) => {
        console.error(err);
        setTrackError(err.message || "Error loading tracking data");
      })
      .finally(() => {
        setTrackLoading(false);
      });
  }, [isTrackMode, stopId, vehicleId]);

  // Build GeoJSON for tracked bus polyline (prefer full polyline from backend)
  const trackLineGeoJson = useMemo(() => {
    if (!trackPred) return null;

    const points =
      Array.isArray(trackPred.polyline) && trackPred.polyline.length > 0
        ? trackPred.polyline
        : Array.isArray(trackPred.waypoints) && trackPred.waypoints.length > 0
        ? trackPred.waypoints
        : null;

    if (!points) return null;

    const coords = points.map((p) => [Number(p.lon), Number(p.lat)]);

    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
      properties: {},
    };
  }, [trackPred]);

  // Extract bus location for marker
  const trackBusPosition = useMemo(() => {
    if (!trackPred || !trackPred.vehicle_lat || !trackPred.vehicle_lon) {
      return null;
    }
    return {
      longitude: Number(trackPred.vehicle_lon),
      latitude: Number(trackPred.vehicle_lat),
    };
  }, [trackPred]);

  // GeoJSON for SmartLaunch circles
  const smartLaunchGeoJson = useMemo(() => {
    const enabled = smartLaunchRules.filter((r) => r.enabled !== false);
    if (enabled.length === 0) return null;

    return {
      type: "FeatureCollection",
      features: enabled.map((rule) =>
        makeCircleFeature(
          rule.center.lat,
          rule.center.lon,
          rule.radiusMeters,
          rule.id,
          rule.stopId
        )
      ),
    };
  }, [smartLaunchRules]);

  // Create a SmartLaunch rule at current map center
  const handleCreateSmartLaunch = () => {
    const stopIdInput = window.prompt(
      "Enter stop ID to auto-open when inside this circle:",
      stopId || ""
    );
    if (!stopIdInput) return;
  
    const radiusStr = window.prompt(
      "Enter radius in meters for this SmartLaunch circle:",
      "200"
    );
    const radiusMeters = Number(radiusStr);
    const finalRadius =
      Number.isFinite(radiusMeters) && radiusMeters > 0 ? radiusMeters : 200;
  
    // if user never clicked on the map yet, fall back to a default center
    const center =
      smartCenter || {
        lat: 43.0731,
        lon: -89.4012,
      };
  
    const newRule = {
      id: String(Date.now()),
      name: `SmartLaunch for stop ${stopIdInput}`,
      stopId: stopIdInput,
      center,
      radiusMeters: finalRadius,
      enabled: true,
    };
  
    setSmartLaunchRules((prev) => {
      const updated = [...prev, newRule];
      saveSmartLaunchRules(updated);
      return updated;
    });
  };
  
  return (
    <main className="home-root">
      <section className="home-phone">
        {/* HEADER */}
        <header className="home-header">
          <div className="home-header-top">
            <div className="home-logo">
              <div className="home-logo-square" />
              <div className="home-wordmark">
                <div className="home-logo-text-main">badger</div>
                <div className="home-logo-text-sub">transit</div>
              </div>
            </div>

            <div className="home-clock">
              <div className="home-clock-date">{dateString}</div>
              <div className="home-clock-time">{timeString}</div>
            </div>
          </div>

          <nav className="home-nav">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `home-nav-tab${isActive ? " home-nav-tab--active" : ""}`
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/routes"
              className={({ isActive }) =>
                `home-nav-tab${isActive ? " home-nav-tab--active" : ""}`
              }
            >
              Timetable
            </NavLink>

            <NavLink
              to="/map"
              className={({ isActive }) =>
                `home-nav-tab${isActive ? " home-nav-tab--active" : ""}`
              }
            >
              Map
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `home-nav-tab${isActive ? " home-nav-tab--active" : ""}`
              }
            >
              Settings
            </NavLink>
          </nav>
        </header>

        {/* OVERLAYS */}
        {isRouteMode && routeLoading && (
          <div className="map-overlay">Loading route {routeId}…</div>
        )}
        {isRouteMode && routeError && (
          <div className="map-overlay map-overlay-error">{routeError}</div>
        )}

        {isTrackMode && trackLoading && (
          <div className="map-overlay">
            Tracking bus {vehicleId} from stop {stopId}…
          </div>
        )}
        {isTrackMode && trackError && (
          <div className="map-overlay map-overlay-error">{trackError}</div>
        )}

        <section className="map-page-main">
          <div className="map-page-map-wrapper">
          <MapView
  onMapClick={(evt) => {
    if (!evt?.lngLat) return;
    const { lat, lng } = evt.lngLat;
    setSmartCenter({ lat, lon: lng });
  }}
>
  {/* Always show stops */}
  <StopMarkers stops={stops} />

  {/* Route mode */}
  {isRouteMode && routeData && <RouteLayer routeData={routeData} />}
  {isRouteMode && routeId && <BusLayer routeId={routeId} />}

  {/* Track mode */}
  {isTrackMode && trackLineGeoJson && (
    <Source id="tracked-bus-line" type="geojson" data={trackLineGeoJson}>
      <Layer
        id="tracked-bus-line-layer"
        type="line"
        paint={{
          "line-color": "#ff0000",
          "line-width": 4,
        }}
      />
    </Source>
  )}

  {isTrackMode && trackBusPosition && (
    <Marker
      longitude={trackBusPosition.longitude}
      latitude={trackBusPosition.latitude}
      anchor="center"
    >
      <div className="tracked-bus-marker">🚌</div>
    </Marker>
  )}

  {/* SmartLaunch circles */}
  {smartLaunchGeoJson && (
    <Source
      id="smartlaunch-circles"
      type="geojson"
      data={smartLaunchGeoJson}
    >
      <Layer
        id="smartlaunch-fill"
        type="fill"
        paint={{
          "fill-color": "#0000ff",
          "fill-opacity": 0.12,
        }}
      />
      <Layer
        id="smartlaunch-outline"
        type="line"
        paint={{
          "line-color": "#0000ff",
          "line-width": 2,
        }}
      />
    </Source>
  )}
</MapView>


            {/* overlay buttons on top of the map */}
            <button
              type="button"
              className="map-page-back-btn"
              onClick={() => navigate(-1)}
            >
              ←
            </button>

            <button type="button" className="map-page-center-btn">
              ⊙
            </button>

            <button type="button" className="map-page-locate-btn">
              ➤
            </button>

            {/* simple SmartLaunch creator */}
            <button
              type="button"
              className="map-smartlaunch-btn"
              onClick={handleCreateSmartLaunch}
            >
              + SmartLaunch here
            </button>
          </div>

          {/* Bus card at bottom when tracking */}
          {isTrackMode && trackPred && (
            <section className="map-track-card">
              <TrackBusCard pred={trackPred} />
            </section>
          )}
        </section>

        {/* FOOTER */}
        <footer className="home-footer">
          <div className="home-footer-left">
            <div className="home-logo-small-square" />
            <span className="home-footer-brand">badger transit</span>
          </div>
          <div className="home-footer-links">
            <button className="home-footer-link" type="button">
              report a bug
            </button>
            <button className="home-footer-link" type="button">
              terms of service
            </button>
          </div>
          <div className="home-footer-meta">badgertransit ©2026</div>
        </footer>
      </section>
    </main>
  );
}

export default MapPage;
