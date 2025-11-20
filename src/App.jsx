// src/App.jsx
import { Routes, Route, Link } from "react-router-dom";
import "./Home.css";
import RoutesPage from "./Routes.jsx";
import MapPage from "./components/MapPage.jsx"; // ← use the dedicated MapPage
import StopPage from "./StopPage.jsx";
import RecentPage from "./Recent.jsx";


// === HOME PAGE ===
function HomePage() {
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
      <section className="home-phone">
        {/* Top bar: logo + time/date */}
        <header className="home-header">
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
        </header>

        {/* Title */}
        <section className="home-hero">
          <h1 className="home-hero-title">
            Select an option to begin tracking
          </h1>
        </section>

        {/* Action cards */}
        <section className="home-card-grid">
          <Link to="/recent" className="home-card">
            <div className="home-card-icon home-card-icon-star" />
            <p className="home-card-title">View your recently visited stops</p>
          </Link>

          <Link to="/stop/10070" className="home-card">
            <div className="home-card-icon home-card-icon-map" />
            <p className="home-card-title">Select a stop from MapView</p>
          </Link>

          <Link to="/map" className="home-card">
            <div className="home-card-icon home-card-icon-location" />
            <p className="home-card-title">See nearby bus stops</p>
          </Link>

          <div className="home-card">
            <div className="home-card-icon home-card-icon-saved" />
            <p className="home-card-title">View your saved stops and groups</p>
          </div>

          <Link to="/routes" className="home-card">
            <div className="home-card-icon home-card-icon-search" />
            <p className="home-card-title">Search for stop by Stop ID</p>
          </Link>

          <Link to="/routes" className="home-card">
            <div className="home-card-icon home-card-icon-routes" />
            <p className="home-card-title">See live bus locations by route</p>
          </Link>
        </section>

        {/* Notice blocks */}
        <section className="home-notice">
          <h2 className="home-notice-title">
            Important Notice:
            <br />
            <br />
            BadgerTransit is designed for experienced Madison Transit riders.
          </h2>
          <p className="home-notice-body">
            BadgerTransit only shows bus arrivals and information. If you&apos;re
            inquiring about navigation, Google Maps or a similar service will
            serve you best.
          </p>
        </section>

        <section className="home-notice secondary">
          <p className="home-notice-title">
            BadgerTransit uses an open source Madison API to obtain bus
            information.
          </p>
          <p className="home-notice-body">
            Designed, coded and used by transit riders in Madison, WI.
          </p>
        </section>

        {/* Footer */}
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

// === ROUTER ===
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/map/:routeId" element={<MapPage />} />
      <Route path="/routes" element={<RoutesPage />} />
      <Route path="/stop/:stopId" element={<StopPage />} />   {/* 👈 new */}
      <Route path="/recent" element={<RecentPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>

  );
}
