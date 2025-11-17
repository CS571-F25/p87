// src/StopPage.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./Stops.css";

// simple route → color map (same palette you used on Routes page)
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

// format "20251115 21:43" -> "9:43 PM"
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
  // EMPTY / HALF_EMPTY / FULL / null
  if (occupancy === "N/A") return 5;
  if (occupancy === "EMPTY") return 1;
  if (occupancy === "HALF_EMPTY") return 3;
  if (occupancy === "FULL") return 5;
  return 0;
}

export default function StopPage() {
  const { stopId } = useParams();
  const [data, setData] = useState(null); // whole response
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- fetch predictions for this stop ---
  useEffect(() => {
    if (!stopId) return;

    setLoading(true);
    setError(null);

    fetch(
      `https://badger-transit-dawn-darkness-55.fly.dev/api/predictions/${stopId}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load predictions");
        return res.json();
      })
      .then((json) => {
        // sort soonest first
        const sorted = [...(json.results || [])].sort(
          (a, b) => (a.eta_minutes ?? 9999) - (b.eta_minutes ?? 9999)
        );
        setData({ ...json, results: sorted });
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Error loading predictions");
      })
      .finally(() => setLoading(false));
  }, [stopId]);

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

  const stopName =
    stopId === "10070"
      ? "W Johnson at East Campus" // TODO: replace with real stop name data
      : `Stop ${stopId}`;

  // --- NEW: persist this stop into localStorage as a "recent stop" ---
  useEffect(() => {
    if (!stopId) return;

    try {
      const STORAGE_KEY = "bt_recent_stops";
      const raw = localStorage.getItem(STORAGE_KEY);
      let recent = [];

      if (raw) {
        try {
          recent = JSON.parse(raw);
          if (!Array.isArray(recent)) recent = [];
        } catch {
          recent = [];
        }
      }

      // remove any existing entry for this stop
      recent = recent.filter((item) => item.stopId !== stopId);

      // add to the front
      recent.unshift({
        stopId,
        name: stopName,
        lastVisited: new Date().toISOString(),
      });

      // keep only latest 10 (or whatever you like)
      recent = recent.slice(0, 10);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch (e) {
      console.error("Failed to persist recent stop", e);
    }
  }, [stopId, stopName]);

  return (
    <main className="stop-root">
      <section className="stop-inner">
        {/* HEADER (clickable back to home) */}
        <header className="routes-header-wrapper">
          <Link to="/" className="routes-header-link">
            <div className="home-header">
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
        </header>

        {/* STOP INFO BAR */}
        <section className="stop-header-bar">
          <div className="stop-header-left">
            <button className="stop-header-circle" type="button">
              ×
            </button>
            <div className="stop-header-text">
              <div className="stop-header-title">Stop #{stopId}</div>
              <div className="stop-header-subtitle">{stopName}</div>
            </div>
          </div>

          <div className="stop-header-actions">
            <button className="stop-add-btn" type="button">
              + Add stop
            </button>
            <button className="stop-save-btn" type="button">
              Save Stop
            </button>
          </div>
        </section>

        {/* COLUMN LABELS */}
        <section className="stop-label-row">
          <span>Route</span>
          <span>Bus Info</span>
        </section>

        {/* BUS CARDS */}
        <section className="stop-cards">
          {loading && <div className="stop-loading">Loading buses…</div>}
          {error && <div className="stop-error">{error}</div>}

          {!loading && !error && data && data.results.length === 0 && (
            <div className="stop-empty">No upcoming buses at this stop.</div>
          )}

          {!loading &&
            !error &&
            data &&
            data.results.map((pred) => {
              const arrivalLabel = formatArrivalTime(pred.predicted_time);
              const stopsAway = formatStopsAway(pred);
              const occDots = getOccupancyDots(pred.occupancy || "");
              const key = pred.trip_uid || `${pred.route}-${pred.predicted_time}`;

              return (
                <article className="bus-card" key={key}>
                  <div
                    className="bus-card-route"
                    style={{ backgroundColor: getRouteColor(pred.route) }}
                  >
                    {pred.route}
                  </div>

                  <div className="bus-card-main">
                    <div className="bus-card-left">
                      <div className="bus-card-top">
                        <div className="bus-card-destination">
                          {pred.destination}
                        </div>
                        <div className="bus-card-times">
                          <div className="bus-card-eta">
                            {pred.eta_minutes != null
                              ? `${pred.eta_minutes} min`
                              : "--"}
                          </div>
                        </div>
                      </div>

                      <div className="bus-card-bottom">
                        <div className="bus-card-occupancy">
                          <div className="bus-card-dots">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={
                                  "occ-dot" +
                                  (i < occDots ? " occ-dot-filled" : "")
                                }
                              />
                            ))}
                          </div>
                          <span className="bus-card-sub">{stopsAway}</span>
                        </div>
                        <div className="bus-card-clock">{arrivalLabel}</div>
                      </div>
                    </div>
                    <div className="bus-card-right">
                      <button className="bus-card-track" type="button">
                        Track
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
        </section>

        <div className="stop-end-label">End of Bus Information</div>

        <section className="stop-report-card">
          <div className="stop-report-icon" />
          <span>Report an issue at this bus stop</span>
        </section>

        {/* FOOTER (same as other pages) */}
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
