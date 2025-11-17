// src/Routes.jsx
import "./Routes.css";
import { Link, useNavigate } from "react-router-dom";



const ROUTE_GROUPS = [
  {
    title: "Bus Rapid Transit",
    routes: [
      { code: "A", color: "#F00" }, // red
      { code: "B", color: "#84BC00" }, // green
      { code: "F", color: "#0039AA" }, // blue
    ],
  },
  {
    title: "Campus Buses",
    routes: [
      { code: "80", color: "#FF7300" },
      { code: "82", color: "#00B7C8" },
      { code: "81", color: "#FF7300" },
      { code: "84", color: "#C1C800" },
    ],
  },
  {
    title: "Standard Service",
    routes: [
      { code: "C", color: "#00B7C8" },
      { code: "D", color: "#FFA600" },
      { code: "E", color: "#C1C800" },
      { code: "G", color: "#00B7C8" },
      { code: "H", color: "#C1C800" },
      { code: "J", color: "#C1C800" },
      { code: "L", color: "#9269EB" },
      { code: "O", color: "#BC009D" },
      { code: "P", color: "#C1C800" },
      { code: "R", color: "#BC009D" },
      { code: "S", color: "#C1C800" },
      { code: "W", color: "#9269EB" },
      { code: "28", color: "#00B7C8" },
      { code: "38", color: "#FF7300" },
      { code: "55", color: "#FFA600" },
      { code: "60", color: "#9269EB" },
      { code: "61", color: "#9269EB" },
      { code: "62", color: "#FFA600" },
      { code: "63", color: "#9269EB" },
      { code: "64", color: "#FF7300" },
      { code: "65", color: "#BC009D" },
      { code: "75", color: "#9269EB" },
    ],
  },
];

export default function RoutesPage() {
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
    <main className="routes-root">
      <section className="routes-inner">
        {/* Reuse header from home page */}
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

        {/* Title + subtitle */}
        <section className="routes-hero">
          <h1 className="routes-hero-title">→ Routes</h1>
          <p className="routes-hero-subtitle">
            Select a route to see live bus locations
          </p>
        </section>

        {/* Route groups */}
        <section className="routes-groups">
          {ROUTE_GROUPS.map((group) => (
            <article key={group.title} className="routes-panel">
              <h2 className="routes-panel-title">{group.title}</h2>
              <div className="routes-chip-row">
                {group.routes.map((route) => (
                  <Link to={"/map/" + route.code}>
                    <button
                      key={route.code}
                      type="button"
                      className="route-chip"
                      style={{ backgroundColor: route.color }}
                    >
                    {route.code}
                    </button>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </section>

        {/* Footer reused from home */}
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
