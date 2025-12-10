// src/Recent.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, NavLink} from "react-router-dom";
import "./Stops.css";

const STORAGE_KEY = "bt_recent_stops";

function formatLastVisited(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const datePart = d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  const timePart = d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

export default function RecentPage() {
  const [recentStops, setRecentStops] = useState([]);

  // read from localStorage once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setRecentStops([]);
        return;
      }

      let parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) parsed = [];

      // sort newest → oldest just in case
      parsed.sort((a, b) => {
        const da = new Date(a.lastVisited || 0).getTime();
        const db = new Date(b.lastVisited || 0).getTime();
        return db - da;
      });

      setRecentStops(parsed);
    } catch (e) {
      console.error("Failed to read recent stops", e);
      setRecentStops([]);
    }
  }, []);

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
    <main className="stop-root">
      <section className="stop-inner">
        {/* HEADER – same as StopPage, clickable back to home */}
        <header className="home-header">
        <Link to="/" className="routes-header-link">
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
          </Link>

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
              to="/recent" // hook this up to your timetable page later if you want
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
              to="/routes" // now points to SmartLaunchPage
              className={({ isActive }) =>
                `home-nav-tab${isActive ? " home-nav-tab--active" : ""}`
              }
            >
              Routes
            </NavLink>
          </nav>
        </header>

        {/* PAGE TITLE BAR */}
        <section className="stop-header-bar">
          <div className="stop-header-left">
            <div className="stop-header-text">
              <div className="stop-header-title">Recent stops</div>
              <div className="stop-header-subtitle">
                Stops you&apos;ve viewed recently
              </div>
            </div>
          </div>
        </section>

        {/* COLUMN LABELS (reuse style) */}
        <section className="stop-label-row">
          <span>Stop</span>
          <span>Last visited</span>
        </section>

        {/* RECENT STOP CARDS – reuse bus-card styling */}
        <section className="stop-cards">
          {recentStops.length === 0 && (
            <div className="stop-empty">
              You haven&apos;t viewed any stops yet.
            </div>
          )}

          {recentStops.map((stop) => (
            <Link
              key={stop.stopId}
              to={`/stop/${stop.stopId}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <article className="bus-card">
                {/* reuse bus-card-route as left pill, use a neutral color */}
                <div
                  className="bus-card-route"
                  style={{ backgroundColor: "#111827" }}
                >
                  {stop.stopId}
                </div>

                <div className="bus-card-main">
                  <div className="bus-card-left">
                    <div className="bus-card-top">
                      <div className="bus-card-destination">
                        {stop.name || `Stop ${stop.stopId}`}
                      </div>
                      <div className="bus-card-times">
                        <div className="bus-card-eta">
                          {formatLastVisited(stop.lastVisited)}
                        </div>
                      </div>
                    </div>

                    <div className="bus-card-bottom">
                      <div className="bus-card-occupancy">
                        {/* empty dot row just to keep layout consistent */}
                        <div className="bus-card-dots">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="occ-dot" />
                          ))}
                        </div>
                        <span className="bus-card-sub">
                          Tap to view arrivals
                        </span>
                      </div>
                      {/* right side left blank here; clock slot unused */}
                      <div className="bus-card-clock" />
                    </div>
                  </div>

                  <div className="bus-card-right">
                    <button className="bus-card-track" type="button">
                      View stop
                    </button>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </section>

        {/* FOOTER same as other pages */}
        <footer className="home-footer routes-footer">
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
