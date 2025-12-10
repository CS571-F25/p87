// src/App.jsx
import { useEffect, useState, useRef } from "react";
import { Routes, Route, Link, NavLink, useNavigate } from "react-router-dom";
import "./Home.css";
import RoutesPage from "./Routes.jsx";
import MapPage from "./MapPage.jsx";
import StopPage from "./StopPage.jsx";
import RecentPage from "./Recent.jsx";
import SmartLaunchPage from "./SmartLaunch.jsx";
import { loadSmartLaunchRules } from "./utils/smartLaunch";
import SavedPage from "./Saved.jsx";

// simple haversine distance in meters
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isRuleActiveNow(rule, now = new Date()) {
  if (!rule.startTime || !rule.endTime) {
    // no time window -> always active
    return true;
  }

  const [sh, sm] = rule.startTime.split(":").map(Number);
  const [eh, em] = rule.endTime.split(":").map(Number);
  if (
    !Number.isFinite(sh) ||
    !Number.isFinite(sm) ||
    !Number.isFinite(eh) ||
    !Number.isFinite(em)
  ) {
    return true; // fallback if stored weird
  }

  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (startMin <= endMin) {
    // simple window, e.g. 07:00–12:00
    return nowMin >= startMin && nowMin <= endMin;
  } else {
    // wraps midnight, e.g. 22:00–02:00
    return nowMin >= startMin || nowMin <= endMin;
  }
}

// === HOME PAGE ===
function HomePage() {
  const navigate = useNavigate();
  const [redirectInfo, setRedirectInfo] = useState(null);
  const timeoutRef = useRef(null);
  const cancelledRef = useRef(false);

  // SmartLaunch auto-jump on home load
  useEffect(() => {
    const rules = loadSmartLaunchRules().filter((r) => r.enabled !== false);
    if (rules.length === 0) return;

    if (!("geolocation" in navigator)) return;

    // fresh mount: assume not cancelled
    cancelledRef.current = false;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const now = new Date();

        const match = rules.find((rule) => {
          if (!isRuleActiveNow(rule, now)) {
            return false;
          }
          const d = distanceMeters(
            latitude,
            longitude,
            rule.center.lat,
            rule.center.lon
          );
          return d <= rule.radiusMeters;
        });

        if (match && !cancelledRef.current) {
          // show toast
          setRedirectInfo({
            stopId: match.stopId,
            name: match.name || `Stop ${match.stopId}`,
          });

          // then navigate after a short delay
          timeoutRef.current = window.setTimeout(() => {
            // extra safety guard in case user clicked Stop or component unmounted
            if (!cancelledRef.current) {
              navigate(`/stop/${match.stopId}`);
            }
            timeoutRef.current = null;
          }, 1100); // Match the CSS animation duration
        }
      },
      (err) => {
        console.warn("SmartLaunch geolocation failed/denied", err);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60000,
        timeout: 10000,
      }
    );

    return () => {
      // mark as cancelled so any late timer won't navigate
      cancelledRef.current = true;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [navigate]);

  const handleCancelRedirect = () => {
    // mark as cancelled so even if timeout fires, it won't navigate
    cancelledRef.current = true;

    // Clear the timeout to prevent navigation
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Hide the toast
    setRedirectInfo(null);
  };

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

  return (
    <main className="home-root">
      <div className="home-phone">
        {redirectInfo && (
          <div 
            className="smartlaunch-toast" 
            role="alert" 
            aria-live="assertive"
          >
            <div className="smartlaunch-toast-inner">
              <div className="smartlaunch-toast-icon-circle" aria-hidden="true">
                <svg className="smartlaunch-progress-svg" viewBox="0 0 88 88">
                  <circle className="bg"></circle>
                  <circle className="fg"></circle>
                </svg>
                <span className="smartlaunch-toast-icon-arrow">➜</span>
              </div>
              <div className="smartlaunch-toast-stop-id">
                #{redirectInfo.stopId}
              </div>
              <button
                type="button"
                className="smartlaunch-toast-button"
                onClick={handleCancelRedirect}
                aria-label={`Cancel redirect to stop ${redirectInfo.stopId}`}
              >
                Stop
              </button>
            </div>
          </div>
        )}

        {/* Top bar: logo + time/date + nav */}
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

        {/* Title */}
        <section className="home-hero" aria-labelledby="hero-title">
          <h1 id="hero-title" className="home-hero-title">
            Select an option to begin tracking
          </h1>
        </section>

        {/* Action cards */}
        <section className="home-card-grid" aria-label="Quick actions">
          <Link to="/recent" className="home-card">
            <div className="home-card-icon home-card-icon-star" aria-hidden="true" />
            <p className="home-card-title">View your recently visited stops</p>
          </Link>

          <Link to="/map" className="home-card">
            <div className="home-card-icon home-card-icon-map" aria-hidden="true" />
            <p className="home-card-title">Select a stop from MapView</p>
          </Link>

          <Link to="/map" className="home-card">
            <div className="home-card-icon home-card-icon-location" aria-hidden="true" />
            <p className="home-card-title">See nearby bus stops</p>
          </Link>

          <Link to="/saved" className="home-card">
            <div className="home-card-icon home-card-icon-saved" aria-hidden="true" />
            <p className="home-card-title">View your saved stops and groups</p>
          </Link>

          <Link to="/routes" className="home-card">
            <div className="home-card-icon home-card-icon-search" aria-hidden="true" />
            <p className="home-card-title">Search for stop by Stop ID</p>
          </Link>

          <Link to="/routes" className="home-card">
            <div className="home-card-icon home-card-icon-routes" aria-hidden="true" />
            <p className="home-card-title">See live bus locations by route</p>
          </Link>
        </section>

        {/* User Settings Section */}
        <section className="home-hero" aria-labelledby="settings-title">
          <h2 id="settings-title" className="home-hero-title">User Settings</h2>
        </section>

        {/* Settings card */}
        <section className="home-card-grid" aria-label="User settings">
          <Link to="/settings" className="home-card">
            <div className="home-card-icon home-card-icon-launch" aria-hidden="true" />
            <p className="home-card-title">Configure SmartLaunch</p>
          </Link>
        </section>

        {/* Notice blocks */}
        <section className="home-notice" aria-labelledby="notice-title">
          <h2 id="notice-title" className="home-notice-title">
            Important Notice: BadgerTransit is designed for experienced Madison Transit riders.
          </h2>
          <p className="home-notice-body">
            BadgerTransit does not provide navigation. Users are expected to
            know which bus stops they must board and depart at.
          </p>
        </section>

        <section className="home-notice secondary" aria-labelledby="about-title">
          <h3 id="about-title" className="home-notice-title">
            BadgerTransit uses an open source Madison API to obtain bus
            information.
          </h3>
          <p className="home-notice-body">
            Designed, coded and used by transit riders in Madison, WI.
          </p>
        </section>

        {/* Footer */}
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
          <div className="home-footer-meta">
            badgertransit ©2026 built for CS571
          </div>
        </footer>
      </div>
    </main>
  );
}

// === ROUTER ===
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* Map modes */}
      <Route path="/map" element={<MapPage />} />
      <Route path="/map/:routeId" element={<MapPage />} />
      {/* track a single bus from a stop */}
      <Route path="/map/:stopId/:vehicleId" element={<MapPage />} />

      <Route path="/routes" element={<RoutesPage />} />
      <Route path="/stop/:stopId" element={<StopPage />} />
      <Route path="/recent" element={<RecentPage />} />
      <Route path="/saved" element={<SavedPage />} />
      {/* Settings -> SmartLaunch */}
      <Route path="/settings" element={<SmartLaunchPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}