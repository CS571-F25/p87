// src/SavedPage.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, NavLink } from "react-router-dom";
import "./Stops.css";

const STORAGE_KEY = "bt_saved_stops";

function formatSavedDate(iso) {
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

export default function SavedPage() {
  const navigate = useNavigate();
  const [savedStops, setSavedStops] = useState([]);

  // Load saved stops from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setSavedStops([]);
        return;
      }

      let parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) parsed = [];

      // Sort newest first
      parsed.sort((a, b) => {
        const da = new Date(a.savedAt || 0).getTime();
        const db = new Date(b.savedAt || 0).getTime();
        return db - da;
      });

      setSavedStops(parsed);
    } catch (e) {
      console.error("Failed to read saved stops", e);
      setSavedStops([]);
    }
  }, []);

  const handleDelete = (id, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Delete this saved stop/group?")) return;

    try {
      const updated = savedStops.filter((item) => item.id !== id);
      setSavedStops(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const handleNavigate = (item) => {
    const [primary, ...others] = item.stopIds;
    const stopsParam = others.length > 0 ? `?stops=${others.join(',')}` : '';
    navigate(`/stop/${primary}${stopsParam}`);
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
    <main className="stop-root">
      <section className="stop-inner">
        {/* HEADER */}
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

        {/* PAGE TITLE BAR */}
        <section className="stop-header-bar">
          <div className="stop-header-left">
            <div className="stop-header-text">
              <div className="stop-header-title">Saved stops</div>
              <div className="stop-header-subtitle">
                Your saved stops and groups
              </div>
            </div>
          </div>
        </section>

        {/* COLUMN LABELS */}
        <section className="stop-label-row">
          <span>Stop</span>
          <span>Saved</span>
        </section>

        {/* SAVED STOP CARDS */}
        <section className="stop-cards">
          {savedStops.length === 0 && (
            <div className="stop-empty">
              You haven&apos;t saved any stops yet.
            </div>
          )}

          {savedStops.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNavigate(item)}
              style={{ cursor: "pointer" }}
            >
              <article className="bus-card">
                {/* Left pill showing stop count or single stop ID */}
                <div
                  className="bus-card-route"
                  style={{ 
                    backgroundColor: item.isGroup ? "#8B5CF6" : "#111827",
                    minWidth: item.isGroup ? "60px" : "50px"
                  }}
                >
                  {item.isGroup 
                    ? `${item.stopIds.length} stops`
                    : item.stopIds[0]
                  }
                </div>

                <div className="bus-card-main">
                  <div className="bus-card-left">
                    <div className="bus-card-top">
                      <div className="bus-card-destination">
                        {item.name}
                        {item.isGroup && (
                          <span style={{ 
                            marginLeft: "8px", 
                            fontSize: "12px",
                            color: "#8B5CF6",
                            fontWeight: "600"
                          }}>
                            GROUP
                          </span>
                        )}
                      </div>
                      <div className="bus-card-times">
                        <div className="bus-card-eta">
                          {formatSavedDate(item.savedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="bus-card-bottom">
                      <div className="bus-card-occupancy">
                        <div className="bus-card-dots">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="occ-dot" />
                          ))}
                        </div>
                        <span className="bus-card-sub">
                          {item.isGroup
                            ? `Stops: ${item.stopIds.join(', ')}`
                            : "Tap to view arrivals"
                          }
                        </span>
                      </div>
                      <div className="bus-card-clock" />
                    </div>
                  </div>

                  <div className="bus-card-right">
                    <button
                      className="bus-card-track"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(item);
                      }}
                      style={{ marginRight: "8px" }}
                    >
                      View
                    </button>
                    <button
                      className="bus-card-track"
                      type="button"
                      onClick={(e) => handleDelete(item.id, e)}
                      style={{
                        backgroundColor: "#EF4444",
                        borderColor: "#EF4444"
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </section>

        {/* FOOTER */}
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