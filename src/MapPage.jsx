// src/components/MapPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, NavLink, Link, useSearchParams } from "react-router-dom";

import MapView from "./components/MapView";
import StopMarkers from "./components/StopMarkers";
import BusLayer from "./components/BusLayer";
import RouteLayer from "./components/RouteLayer";
import { loadStops } from "./utils/loadStops";
import { loadSmartLaunchRules, saveSmartLaunchRules } from "./utils/smartLaunch";
import "./Home.css";
import "./Map.css";

import { Marker, Source, Layer } from "react-map-gl";

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
    <article 
      className="bus-card"
      aria-label={`Route ${pred.route} to ${pred.destination}, arriving in ${pred.eta_minutes} minutes`}
    >
      <div
        className="bus-card-route"
        style={{ backgroundColor: getRouteColor(pred.route) }}
        aria-label={`Route ${pred.route}`}
      >
        {pred.route}
      </div>

      <div className="bus-card-main">
        <div className="bus-card-left">
          {/* top row */}
          <div className="bus-card-top">
            <div className="bus-card-destination">{pred.destination}</div>
            <div className="bus-card-times">
              <div className="bus-card-eta" aria-label={`Estimated time: ${pred.eta_minutes} minutes`}>
                {pred.eta_minutes != null ? `${pred.eta_minutes} min` : "--"}
              </div>
            </div>
          </div>

          {/* second row */}
          <div className="bus-card-bottom">
            <div className="bus-card-occupancy">
              <div className="bus-card-dots" aria-label={`Occupancy: ${pred.occupancy || "unknown"}`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={
                      "occ-dot" + (i < occDots ? " occ-dot-filled" : "")
                    }
                    aria-hidden="true"
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
          <div className="bus-card-track bus-card-track--inactive" aria-label="Currently tracking this bus">
            Tracking
          </div>
        </div>
      </div>
    </article>
  );
}

/* ====== SIMPLE CIRCLE POLYGON FOR SMARTLAUNCH ====== */

function makeCircleFeature(lat, lon, radiusMeters, id, stopId, points = 64) {
  const coords = [];
  const R = 111320;
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selection mode for adding stops
  const selectMode = searchParams.get('selectMode') === 'true';
  const returnTo = searchParams.get('returnTo');
  const existingStops = searchParams.get('existingStops');

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

  // Map Loaded State
  const [isMapLoaded, setIsMapLoaded] = useState(false);

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

  // Build GeoJSON for tracked bus polyline
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
    // TODO: Replace with accessible modal dialog
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

  // Handle stop selection in selection mode
  const handleStopClick = (clickedStopId) => {
    if (!selectMode || !returnTo) {
      // Normal mode: navigate to stop page
      navigate(`/stop/${clickedStopId}`);
      return;
    }

    // Selection mode: add stop to existing list and return
    const currentStops = existingStops ? existingStops.split(',') : [];
    
    // Don't add if already in list
    if (currentStops.includes(clickedStopId)) {
      // TODO: Replace with accessible notification
      alert(`Stop ${clickedStopId} is already added to your group!`);
      return;
    }

    currentStops.push(clickedStopId);
    
    const [baseUrl] = returnTo.split('?');
    const [primary, ...others] = currentStops;
    const stopsParam = others.length > 0 ? `?stops=${others.join(',')}` : '';
    
    navigate(`${baseUrl}${stopsParam}`);
  };

  return (
    <main className="home-root">
      <div className="home-phone">
        {/* HEADER */}
        <header className="home-header">
          <div className="home-header-top">
            <Link to="/" className="home-logo" aria-label="BadgerTransit Home">
              <div className="home-logo-square" aria-hidden="true" />
              <div className="home-wordmark">
                <div className="home-logo-text-main">badger</div>
                <div className="home-logo-text-sub">transit</div>
              </div>
            </Link>

            <div className="home-clock" aria-live="off">
              <div className="home-clock-date">{dateString}</div>
              <div className="home-clock-time">{timeString}</div>
            </div>
          </div>

          {/* Tab nav */}
          <nav className="home-nav" aria-label="Primary navigation">
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
              to="/recent"
              className={({ isActive }) =>
                `home-nav-tab${isActive ? " home-nav-tab--active" : ""}`
              }
            >
              Recent
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
              to="/routes"
              className={({ isActive }) =>
                `home-nav-tab${isActive ? " home-nav-tab--active" : ""}`
              }
            >
              Routes
            </NavLink>
          </nav>
        </header>

        {/* OVERLAYS */}
        {selectMode && (
          <div 
            className="map-overlay map-select-mode" 
            role="alert" 
            aria-live="polite"
          >
            <div className="map-select-banner">
              <span>🎯 Select a stop to add to your group</span>
              <button 
                onClick={() => navigate(returnTo)} 
                className="map-select-cancel"
                aria-label="Cancel stop selection"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isRouteMode && routeLoading && (
          <div className="map-overlay" role="status" aria-live="polite">
            Loading route {routeId}…
          </div>
        )}
        {isRouteMode && routeError && (
          <div className="map-overlay map-overlay-error" role="alert" aria-live="assertive">
            {routeError}
          </div>
        )}

        {isTrackMode && trackLoading && (
          <div className="map-overlay" role="status" aria-live="polite">
            Tracking bus {vehicleId} from stop {stopId}…
          </div>
        )}
        {isTrackMode && trackError && (
          <div className="map-overlay map-overlay-error" role="alert" aria-live="assertive">
            {trackError}
          </div>
        )}

        <section className="map-page-main" aria-labelledby="map-title">
          <h1 id="map-title" className="visually-hidden">
            {isTrackMode 
              ? `Tracking bus ${vehicleId} from stop ${stopId}` 
              : isRouteMode 
              ? `Route ${routeId} map view`
              : selectMode
              ? "Select a stop to add to group"
              : "Transit map view"}
          </h1>

          <div className="map-page-map-wrapper">
            <MapView
              onLoad={() => setIsMapLoaded(true)}
              onMapClick={(evt) => {
                if (!evt?.lngLat) return;
                const { lat, lng } = evt.lngLat;
                setSmartCenter({ lat, lon: lng });
              }}
              aria-label="Interactive transit map showing bus stops and routes"
            >
              {isMapLoaded && (
                <>
                  <StopMarkers 
                    stops={stops} 
                    onStopClick={handleStopClick}
                    selectMode={selectMode}
                  />

                  {/* Route mode */}
                  {isRouteMode && routeData && (
                    <RouteLayer routeData={routeData} />
                  )}
                  {isRouteMode && routeId && <BusLayer routeId={routeId} />}

                  {/* Track mode */}
                  {isTrackMode && trackLineGeoJson && (
                    <Source
                      id="tracked-bus-line"
                      type="geojson"
                      data={trackLineGeoJson}
                    >
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
                      <div 
                        className="tracked-bus-marker" 
                        role="img" 
                        aria-label={`Bus ${vehicleId} current location`}
                      >
                        🚌
                      </div>
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
                </>
              )}
            </MapView>

            {/* overlay buttons on top of the map */}
            <button
              type="button"
              className="map-page-back-btn"
              onClick={() => navigate(-1)}
              aria-label="Go back to previous page"
            >
              ←
            </button>

            <button 
              type="button" 
              className="map-page-center-btn"
              aria-label="Center map on your location"
            >
              ⊙
            </button>

            <button 
              type="button" 
              className="map-page-locate-btn"
              aria-label="Show your current location"
            >
              ➤
            </button>

            {!selectMode && (
              <button
                type="button"
                className="map-smartlaunch-btn"
                onClick={handleCreateSmartLaunch}
                aria-label="Create SmartLaunch rule at current map location"
              >
                + SmartLaunch here
              </button>
            )}
          </div>

          {/* Bus card at bottom when tracking */}
          {isTrackMode && trackPred && (
            <section className="map-track-card" aria-labelledby="tracking-title">
              <h2 id="tracking-title" className="visually-hidden">Currently Tracking Bus</h2>
              <TrackBusCard pred={trackPred} />
            </section>
          )}
        </section>

        {/* FOOTER */}
        <footer className="home-footer">
          <div className="home-footer-left">
            <div className="home-logo-small-square" aria-hidden="true" />
            <span className="home-footer-brand">badger transit</span>
          </div>
          <div className="home-footer-links">
            <a 
              href="mailto:support@badgertransit.com?subject=Bug Report" 
              className="home-footer-link"
            >
              report a bug
            </a>
            <a 
              href="/terms" 
              className="home-footer-link"
            >
              terms of service
            </a>
          </div>
          <div className="home-footer-meta">badgertransit ©2026</div>
        </footer>
      </div>
    </main>
  );
}

export default MapPage;