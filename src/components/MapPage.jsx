// src/components/MapPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";

import MapView from "./MapView";
import StopMarkers from "./StopMarkers";
import BusLayer from "./BusLayer";
import RouteLayer from "./RouteLayer";
import { loadStops } from "../utils/loadStops";
import "../Home.css";
import "./Map.css";

function MapPage() {
  const { routeId } = useParams(); // /map, /map/A, /map/80, etc.
  const navigate = useNavigate();

  const [stops, setStops] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);

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

  // Load stops
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
    <main className="home-root">
      <section className="home-phone">
        {/* === HEADER (reused from HomePage) === */}
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

          {/* Tab nav */}
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
              to="/settings" // falls back to HomePage for now
              className={({ isActive }) =>
                `home-nav-tab${isActive ? " home-nav-tab--active" : ""}`
              }
            >
              Settings
            </NavLink>
          </nav>
        </header>

        {/* === MAP LAYOUT === */}
        {routeLoading && routeId && (
          <div className="map-overlay">Loading route {routeId}…</div>
        )}
        {routeError && (
          <div className="map-overlay map-overlay-error">{routeError}</div>
        )}

        <section className="map-page-main">
          <div className="map-page-map-wrapper">
            <MapView>
              <StopMarkers stops={stops} />
              {routeData && <RouteLayer routeData={routeData} />}
              {routeId && <BusLayer routeId={routeId} />}
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
          </div>
        </section>

        {/* === FOOTER (same as HomePage) === */}
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
