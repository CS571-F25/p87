// src/StopPage.jsx
import { useEffect, useState } from "react";
import { NavLink, useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import "./Stops.css";
import "./Home.css";

const ROUTE_COLORS = {
  // Bus Rapid Transit
  A:  "#FF0000",
  A1: "#FF0000",
  A2: "#FF0000",
  B:  "#84BC00",
  F:  "#0039AA",

  // Campus Buses
  80: "#FF7300",
  81: "#FF7300",
  82: "#00B7C8",
  84: "#C1C800",

  // Standard Service
  C:  "#00B7C8",
  D:  "#FFA600",
  D1:  "#FFA600",
  D2:  "#FFA600",
  E:  "#C1C800",
  G:  "#00B7C8",
  H:  "#C1C800",
  J:  "#C1C800",
  L:  "#9269EB",
  O:  "#BC009D",
  P:  "#C1C800",
  R:  "#BC009D",
  R1:  "#BC009D",
  R2:  "#BC009D",
  S:  "#C1C800",
  W:  "#9269EB",
  28: "#0039AA",
  38: "#FF7300",
  55: "#FFA600",
  60: "#9269EB",
  61: "#9269EB",
  62: "#FFA600",
  63: "#9269EB",
  64: "#FF7300",
  65: "#BC009D",
  75: "#9269EB",
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

function getOccupancyLabel(occupancy) {
  if (occupancy === "N/A") return "Unknown occupancy";
  if (occupancy === "EMPTY") return "Empty";
  if (occupancy === "HALF_EMPTY") return "Half full";
  if (occupancy === "FULL") return "Full";
  return "Unknown occupancy";
}

function RegularBusCard({ pred, onTrack, stopName }) {
  const arrivalLabel = formatArrivalTime(pred.predicted_time);
  const stopsAwayText = formatStopsAway(pred);
  const occDots = getOccupancyDots(pred.occupancy || "");
  const occLabel = getOccupancyLabel(pred.occupancy || "");

  return (
    <article 
      className="bus-card"
      aria-label={`Route ${pred.route} to ${pred.destination}, arriving in ${pred.eta_minutes} minutes${stopName ? ` at ${stopName}` : ''}`}
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
          <div className="bus-card-top">
            <div className="bus-card-destination">{pred.destination}</div>
            <div className="bus-card-times">
              <div className="bus-card-eta" aria-label={`Estimated arrival: ${pred.eta_minutes} minutes`}>
                {pred.eta_minutes != null ? `${pred.eta_minutes} min` : "--"}
              </div>
            </div>
          </div>

          <div className="bus-card-bottom">
            <div className="bus-card-occupancy">
              <div className="bus-card-dots" aria-label={occLabel}>
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
                {stopsAwayText}
                {stopName && ` • at ${stopName}`}
              </span>
            </div>
            <div className="bus-card-clock">{arrivalLabel}</div>
          </div>
        </div>

        <div className="bus-card-right">
          <button
            className="bus-card-track"
            type="button"
            onClick={onTrack}
            disabled={!onTrack}
            aria-label={`Track bus ${pred.vehicle_id || ''} on route ${pred.route}`}
          >
            Track
          </button>
        </div>
      </div>
    </article>
  );
}

function ShortBusCard({ pred, stopName }) {
  const arrivalLabel = formatArrivalTime(pred.predicted_time);

  return (
    <article 
      className="bus-card-short"
      aria-label={`Route ${pred.route} to ${pred.destination}, arriving in ${pred.eta_minutes} minutes, too far to track${stopName ? ` at ${stopName}` : ''}`}
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
          <div className="bus-card-top">
            <div className="bus-card-destination">{pred.destination}</div>
            <div className="bus-card-times">
              <div className="bus-card-eta" aria-label={`Estimated arrival: ${pred.eta_minutes} minutes`}>
                {pred.eta_minutes != null ? `${pred.eta_minutes} min` : "--"}
              </div>
            </div>
          </div>

          <div className="bus-card-bottom">
            <div className="bus-card-occupancy">
              <span className="bus-card-sub">
                This bus is too far to track
                {stopName && ` • at ${stopName}`}
              </span>
            </div>
            <div className="bus-card-clock">{arrivalLabel}</div>
          </div>
        </div>

        <div className="bus-card-right">
          <div className="bus-card-track-short" aria-hidden="true">--------</div>
        </div>
      </div>
    </article>
  );
}

export default function StopPage() {
  const { stopId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get additional stops from query params
  const additionalStopsParam = searchParams.get('stops');
  const additionalStops = additionalStopsParam 
    ? additionalStopsParam.split(',').filter(Boolean)
    : [];

  // All stops to display (primary + additional)
  const allStopIds = [stopId, ...additionalStops];
  const isMultiStop = allStopIds.length > 1;

  const [stopsData, setStopsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch predictions for all stops
  useEffect(() => {
    if (allStopIds.length === 0) return;

    setLoading(true);
    setError(null);

    Promise.all(
      allStopIds.map(id =>
        fetch(`https://badger-transit-dawn-darkness-55.fly.dev/api/predictions/${id}`)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to load stop ${id}`);
            return res.json();
          })
          .then(json => ({
            stopId: id,
            results: json.results || []
          }))
      )
    )
      .then(results => {
        const dataMap = {};
        results.forEach(({ stopId: id, results: preds }) => {
          dataMap[id] = preds.sort(
            (a, b) => (a.eta_minutes ?? 9999) - (b.eta_minutes ?? 9999)
          );
        });
        setStopsData(dataMap);
      })
      .catch(err => {
        console.error(err);
        setError(err.message || "Error loading predictions");
      })
      .finally(() => setLoading(false));
  }, [allStopIds.join(',')]);

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

  const getStopName = (id) => {
    return id === "10070" ? "W Johnson at East Campus" : `Stop ${id}`;
  };

  // Persist recent stop
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

      recent = recent.filter((item) => item.stopId !== stopId);

      recent.unshift({
        stopId,
        name: getStopName(stopId),
        lastVisited: new Date().toISOString(),
      });

      recent = recent.slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch (e) {
      console.error("Failed to persist recent stop", e);
    }
  }, [stopId]);

  const handleAddStop = () => {
    const currentStops = allStopIds.join(',');
    navigate(`/map?selectMode=true&returnTo=/stop/${stopId}&existingStops=${currentStops}`);
  };

  const handleSaveStop = () => {
    try {
      const SAVED_KEY = "bt_saved_stops";
      const raw = localStorage.getItem(SAVED_KEY);
      let saved = [];

      if (raw) {
        try {
          saved = JSON.parse(raw);
          if (!Array.isArray(saved)) saved = [];
        } catch {
          saved = [];
        }
      }

      // TODO: Replace with accessible modal dialog
      const groupName = isMultiStop
        ? window.prompt("Name this stop group:", `Group ${saved.length + 1}`)
        : window.prompt("Name this stop:", getStopName(stopId));

      if (!groupName) return;

      const newItem = {
        id: `saved_${Date.now()}`,
        name: groupName,
        stopIds: allStopIds,
        isGroup: isMultiStop,
        savedAt: new Date().toISOString(),
      };

      saved.unshift(newItem);
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved));

      navigate('/saved');
    } catch (e) {
      console.error("Failed to save stop", e);
      alert("Failed to save stop. Please try again.");
    }
  };

  const handleRemoveStop = (idToRemove) => {
    const remaining = allStopIds.filter(id => id !== idToRemove);
    if (remaining.length === 0) {
      navigate('/');
      return;
    }
    
    const [primary, ...others] = remaining;
    const stopsParam = others.length > 0 ? `?stops=${others.join(',')}` : '';
    navigate(`/stop/${primary}${stopsParam}`);
  };

  // Combine and sort all predictions
  const allPredictions = [];
  Object.keys(stopsData).forEach(id => {
    const preds = stopsData[id] || [];
    preds.forEach(pred => {
      allPredictions.push({
        ...pred,
        sourceStopId: id,
        sourceStopName: getStopName(id)
      });
    });
  });
  allPredictions.sort((a, b) => (a.eta_minutes ?? 9999) - (b.eta_minutes ?? 9999));

  const pageTitle = isMultiStop 
    ? `${allStopIds.length} Stops - ${allStopIds.map(getStopName).join(', ')}`
    : `Stop ${stopId} - ${getStopName(stopId)}`;

  return (
    <main className="stop-root">
      <div className="stop-inner">
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

        <section className="stop-header-bar" aria-labelledby="stop-title">
          <div className="stop-header-left">
            <button 
              className="stop-header-circle" 
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back to previous page"
            >
              ×
            </button>
            <div className="stop-header-text">
              <h1 id="stop-title" className="stop-header-title">
                {isMultiStop ? `${allStopIds.length} Stops` : `Stop #${stopId}`}
              </h1>
              <div className="stop-header-subtitle">
                {isMultiStop 
                  ? allStopIds.map(getStopName).join(' • ')
                  : getStopName(stopId)
                }
              </div>
            </div>
          </div>

          <div className="stop-header-actions">
            <button 
              className="stop-add-btn" 
              type="button"
              onClick={handleAddStop}
              aria-label="Add another stop to this view"
            >
              + Add stop
            </button>
            <button 
              className="stop-save-btn" 
              type="button"
              onClick={handleSaveStop}
              aria-label={isMultiStop ? "Save this group of stops" : "Save this stop"}
            >
              {isMultiStop ? 'Save Group' : 'Save Stop'}
            </button>
          </div>
        </section>

        {isMultiStop && (
          <section className="stop-chips" aria-label="Selected stops">
            {allStopIds.map(id => (
              <div key={id} className="stop-chip">
                <span>Stop {id}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveStop(id)}
                  className="stop-chip-remove"
                  aria-label={`Remove stop ${id} from this group`}
                >
                  ×
                </button>
              </div>
            ))}
          </section>
        )}

        <div className="stop-label-row" role="presentation">
          <span>Route</span>
          <span>Bus Info</span>
        </div>

        <section className="stop-cards" aria-labelledby="upcoming-buses-title">
          <h2 id="upcoming-buses-title" className="visually-hidden">
            Upcoming Buses
          </h2>

          {loading && (
            <div className="stop-loading" role="status" aria-live="polite">
              Loading buses…
            </div>
          )}
          
          {error && (
            <div className="stop-error" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          {!loading && !error && allPredictions.length === 0 && (
            <div className="stop-empty" role="status">
              No upcoming buses at {isMultiStop ? 'these stops' : 'this stop'}.
            </div>
          )}

          {!loading &&
            !error &&
            allPredictions.map((pred) => {
              const stopsAwayText = formatStopsAway(pred);
              const isEnRoute = stopsAwayText === "En Route";
              const key = `${pred.sourceStopId}-${pred.trip_uid || pred.route}-${pred.predicted_time}`;

              const handleTrack = () => {
                if (!pred.vehicle_id) return;
                navigate(`/map/${pred.sourceStopId}/${pred.vehicle_id}`);
              };

              const stopLabel = isMultiStop ? pred.sourceStopName : null;

              return isEnRoute ? (
                <ShortBusCard key={key} pred={pred} stopName={stopLabel} />
              ) : (
                <RegularBusCard
                  key={key}
                  pred={pred}
                  onTrack={pred.vehicle_id ? handleTrack : undefined}
                  stopName={stopLabel}
                />
              );
            })}
        </section>

        <div className="stop-end-label" role="separator">
          End of Bus Information
        </div>

        <section className="stop-report-card">
          <div className="stop-report-icon" aria-hidden="true" />
          <span>Report an issue at {isMultiStop ? 'these stops' : 'this bus stop'}</span>
        </section>

        <footer className="home-footer routes-footer">
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