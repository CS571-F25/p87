// src/SmartLaunch.jsx
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import "./Home.css";
import "./components/Map.css"; // optional, but you likely have it
import { loadSmartLaunchRules, saveSmartLaunchRules } from "./utils/smartLaunch";

// helper: approximate meters per pixel for web mercator
function metersPerPixelAtLat(zoom, lat) {
  const EARTH_CIRCUMFERENCE = 40075016.686; // meters
  const latRad = (lat * Math.PI) / 180;
  return (
    (Math.cos(latRad) * EARTH_CIRCUMFERENCE) /
    Math.pow(2, zoom + 8) // 256 * 2^zoom => 2^(zoom+8)
  );
}

export default function SmartLaunchPage() {
  const [rules, setRules] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  // form state
  const [stopId, setStopId] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("12:00");

  // map view state for creation
  const [viewState, setViewState] = useState({
    longitude: -89.4012,
    latitude: 43.0731,
    zoom: 15,
  });

  // fixed circle size in pixels
  const CIRCLE_RADIUS_PX = 80;

  // load rules on mount
  useEffect(() => {
    setRules(loadSmartLaunchRules());
  }, []);

  const handleStartCreate = () => {
    setIsCreating(true);
    // optional: reset form defaults
    setStopId("");
    setStartTime("07:00");
    setEndTime("12:00");
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!stopId.trim()) {
      alert("Please enter a stop ID.");
      return;
    }

    const centerLat = viewState.latitude;
    const centerLon = viewState.longitude;
    const mpp = metersPerPixelAtLat(viewState.zoom, centerLat);
    const radiusMeters = mpp * CIRCLE_RADIUS_PX;

    const newRule = {
      id: String(Date.now()),
      name: `SmartLaunch for stop ${stopId.trim()}`,
      stopId: stopId.trim(),
      center: { lat: centerLat, lon: centerLon },
      radiusMeters,
      startTime: startTime || null, // "HH:MM"
      endTime: endTime || null,     // "HH:MM"
      enabled: true,
    };

    const updated = [...rules, newRule];
    setRules(updated);
    saveSmartLaunchRules(updated);

    setIsCreating(false);
  };

  const handleToggleEnabled = (id) => {
    const updated = rules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    setRules(updated);
    saveSmartLaunchRules(updated);
  };

  const handleDelete = (id) => {
    const updated = rules.filter((r) => r.id !== id);
    setRules(updated);
    saveSmartLaunchRules(updated);
  };

  return (
    <main className="home-root">
      <section className="home-phone">
        {/* HEADER (reuse your home header styling) */}
        <header className="home-header">
          <div className="home-header-top">
            <div className="home-logo">
              <div className="home-logo-square" />
              <div className="home-wordmark">
                <div className="home-logo-text-main">badger</div>
                <div className="home-logo-text-sub">transit</div>
              </div>
            </div>

            {/* You can put a title here instead of clock if you want */}
            <div className="home-clock">
              <div className="home-clock-date">SmartLaunch</div>
              <div className="home-clock-time">Automations</div>
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

        {/* MAIN CONTENT */}
        <section className="home-hero">
          <h1 className="home-hero-title">SmartLaunch Automations</h1>
          <p className="home-notice-body">
            Automatically open a stop when you&apos;re in a specific place and time window.
          </p>
        </section>

        {/* Existing rules */}
        <section className="home-card-grid">
          {rules.length === 0 && (
            <p>No SmartLaunch automations yet. Create one below.</p>
          )}

          {rules.map((rule) => (
            <div key={rule.id} className="home-card">
              <p className="home-card-title">{rule.name}</p>
              <p className="home-notice-body">
                Stop: <strong>{rule.stopId}</strong>
                <br />
                Time:{" "}
                {rule.startTime && rule.endTime
                  ? `${rule.startTime}–${rule.endTime}`
                  : "All day"}
                <br />
                Status: {rule.enabled ? "Enabled" : "Disabled"}
              </p>
              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="home-footer-link"
                  onClick={() => handleToggleEnabled(rule.id)}
                >
                  {rule.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  className="home-footer-link"
                  onClick={() => handleDelete(rule.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* New rule / form */}
        <section className="home-notice secondary">
          {!isCreating ? (
            <button
              type="button"
              className="home-footer-link"
              onClick={handleStartCreate}
            >
              + New SmartLaunch
            </button>
          ) : (
            <form onSubmit={handleSave}>
              <h2 className="home-notice-title">Create SmartLaunch</h2>

              <div style={{ marginBottom: "0.75rem" }}>
                <label>
                  Stop ID:
                  <input
                    type="text"
                    value={stopId}
                    onChange={(e) => setStopId(e.target.value)}
                    style={{ marginLeft: "0.5rem" }}
                  />
                </label>
              </div>

              <div style={{ marginBottom: "0.75rem" }}>
                <label>
                  Active from:
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ marginLeft: "0.5rem" }}
                  />
                </label>
                <label style={{ marginLeft: "1rem" }}>
                  to
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{ marginLeft: "0.5rem" }}
                  />
                </label>
              </div>

              <p className="home-notice-body">
                Drag and zoom the map so the fixed circle covers the area where you want this automation to trigger.
              </p>

              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "300px",
                  marginBottom: "0.75rem",
                }}
              >
                <Map
                  {...viewState}
                  onMove={(evt) => setViewState(evt.viewState)}
                  style={{ width: "100%", height: "100%" }}
                  minZoom={13}
                  maxZoom={18}
                  mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
                  scrollZoom
                  doubleClickZoom
                  dragRotate={false}
                  touchZoomRotate
                />

                {/* Fixed circle overlay in the center of the map */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: `${CIRCLE_RADIUS_PX * 2}px`,
                    height: `${CIRCLE_RADIUS_PX * 2}px`,
                    marginLeft: `-${CIRCLE_RADIUS_PX}px`,
                    marginTop: `-${CIRCLE_RADIUS_PX}px`,
                    borderRadius: "50%",
                    border: "2px solid red",
                    pointerEvents: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="submit" className="home-footer-link">
                  Save SmartLaunch
                </button>
                <button
                  type="button"
                  className="home-footer-link"
                  onClick={handleCancelCreate}
                >
                  Cancel
                </button>
              </div>
            </form>
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
