// src/components/StopMarkers.jsx
import { useEffect, useState } from "react";
import { useMap } from "react-map-gl";
import mapboxgl from "mapbox-gl";
import busstopIconUrl from "../assets/busstop.svg?url";
import brtstopIconUrl from "../assets/brtstop.svg?url";
import flamingoIconUrl from "../assets/flamingo.svg?url";
import poiCsvUrl from "../assets/poi.csv?url";

// Generic helper to ensure an icon is loaded once
async function ensureIcon(map, iconId, iconUrl) {
  if (map.hasImage(iconId)) return;

  await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        if (!map.hasImage(iconId)) {
          map.addImage(iconId, img, { pixelRatio: 2 });
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = (err) => {
      reject(err || new Error(`Failed to load icon: ${iconId}`));
    };

    img.src = iconUrl;
  });
}

// Load and parse poi.csv into an array of records
async function loadPois() {
  const resp = await fetch(poiCsvUrl);
  if (!resp.ok) {
    throw new Error(
      `Failed to load POI CSV: ${resp.status} ${resp.statusText}`
    );
  }

  const text = await resp.text();
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const [headerLine, ...dataLines] = lines;
  const headers = headerLine.split(",");

  const records = dataLines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = line.split(",");
      const record = {};
      headers.forEach((h, i) => {
        record[h] = cols[i];
      });
      return record;
    });

  return records;
}

// Hash function to consistently assign stops to zoom levels
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function StopMarkers({ stops = [], onStopClick, selectMode = false }) {
  const mapInstance = useMap();
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const map =
      mapInstance?.current?.getMap?.() ??
      mapInstance?.current ??
      mapInstance;

    if (!map) return;

    const sourceId = "stops-source";
    const layerId = "stops-layer";
    const BUS_ICON_ID = "busstop-icon";
    const BRT_ICON_ID = "brtstop-icon";
    const FLAMINGO_ICON_ID = "flamingo-icon";

    const updateZoom = () => {
      setZoom(map.getZoom());
    };

    const addStopsLayer = async () => {
      try {
        await Promise.all([
          ensureIcon(map, BUS_ICON_ID, busstopIconUrl),
          ensureIcon(map, BRT_ICON_ID, brtstopIconUrl),
          ensureIcon(map, FLAMINGO_ICON_ID, flamingoIconUrl),
        ]);

        if (!isMounted) return;

        // Assign each stop a "zoom priority" based on its ID hash
        const stopFeatures = (stops || []).map((stop) => {
          const stopIdRaw = stop.stop_id ?? stop.stop_code ?? "";
          const stopId = String(stopIdRaw);
          const icon = stopId.length === 5 ? BRT_ICON_ID : BUS_ICON_ID;
          
          // Calculate priority (0-100) - lower numbers show at lower zoom levels
          const priority = hashCode(stopId) % 100;

          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [
                Number(stop.stop_lon),
                Number(stop.stop_lat),
              ],
            },
            properties: {
              id: stopId,
              name: stop.stop_name,
              code: stop.stop_code,
              icon,
              priority, // Add priority property
            },
          };
        });

        const pois = await loadPois();
        if (!isMounted) return;

        const flamingoPois = pois.filter(
          (poi) => poi.poi_code === "123456"
        );

        const flamingoFeatures = flamingoPois.map((poi) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              Number(poi.poi_lon),
              Number(poi.poi_lat),
            ],
          },
          properties: {
            id: poi.poi_code,
            name: poi.stop_name,
            code: poi.poi_code,
            icon: FLAMINGO_ICON_ID,
            priority: 0, // Always show flamingos
          },
        }));

        const geojsonData = {
          type: "FeatureCollection",
          features: [...stopFeatures, ...flamingoFeatures],
        };

        if (!map.isStyleLoaded()) {
          console.warn("Style not loaded yet, skipping addSource");
          return;
        }

        const existingSource = map.getSource(sourceId);
        if (existingSource && typeof existingSource.setData === "function") {
          existingSource.setData(geojsonData);
        } else {
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
              type: "geojson",
              data: geojsonData,
            });
          }
        }

        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: "symbol",
            source: sourceId,
            minzoom: 12, // Start showing stops at zoom 12
            maxzoom: 19,
            layout: {
              "icon-image": ["get", "icon"],
              "icon-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12, selectMode ? 0.4 : 0.3,  // Larger in select mode
                16, [
                  "case",
                  ["==", ["get", "icon"], BRT_ICON_ID], selectMode ? 1.2 : 1,
                  ["==", ["get", "icon"], FLAMINGO_ICON_ID], selectMode ? 1.8 : 1.5,
                  selectMode ? 0.6 : 0.5,
                ],
                19, [
                  "case",
                  ["==", ["get", "icon"], BRT_ICON_ID], selectMode ? 1.2 : 1,
                  ["==", ["get", "icon"], FLAMINGO_ICON_ID], selectMode ? 1.8 : 1.5,
                  selectMode ? 0.6 : 0.5,
                ]
              ],
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              // Add opacity animation in select mode
              "icon-opacity": selectMode ? 0.9 : 1,
            },
            // Filter based on zoom level and priority
            filter: [
              "any",
              ["==", ["get", "icon"], FLAMINGO_ICON_ID], // Always show flamingos
              [
                "all",
                [">=", ["zoom"], 15],
              ],
              [
                "all",
                [">=", ["zoom"], 14],
                ["<", ["zoom"], 15],
                ["<", ["get", "priority"], 50], // 50% of stops
              ],
              [
                "all",
                [">=", ["zoom"], 13],
                ["<", ["zoom"], 14],
                ["<", ["get", "priority"], 10], // 10% of stops
              ],
              [
                "all",
                [">=", ["zoom"], 12],
                ["<", ["zoom"], 13],
                ["<", ["get", "priority"], 5], // 5% of stops
              ],
            ],
          });

          // Click handler - passes stop_id to onStopClick
          map.on("click", layerId, (e) => {
            if (!e.features || !e.features[0]) return;
            const coordinates = e.features[0].geometry.coordinates.slice();
            const { name, code, id } = e.features[0].properties;

            // In select mode, just call onStopClick with the stop ID
            if (selectMode && onStopClick) {
              onStopClick(id || code);
              return;
            }

            // In normal mode, show popup and optionally call onStopClick
            new mapboxgl.Popup()
              .setLngLat(coordinates)
              .setHTML(`<b>${name}</b><br/>Code: ${code}`)
              .addTo(map);

            if (onStopClick) {
              onStopClick(id || code);
            }
          });

          map.on("mouseenter", layerId, () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", layerId, () => {
            map.getCanvas().style.cursor = "";
          });
        } else {
          // Layer exists, update its properties if in select mode
          map.setLayoutProperty(
            layerId,
            "icon-size",
            [
              "interpolate",
              ["linear"],
              ["zoom"],
              12, selectMode ? 0.4 : 0.3,
              16, [
                "case",
                ["==", ["get", "icon"], BRT_ICON_ID], selectMode ? 1.2 : 1,
                ["==", ["get", "icon"], FLAMINGO_ICON_ID], selectMode ? 1.8 : 1.5,
                selectMode ? 0.6 : 0.5,
              ],
              19, [
                "case",
                ["==", ["get", "icon"], BRT_ICON_ID], selectMode ? 1.2 : 1,
                ["==", ["get", "icon"], FLAMINGO_ICON_ID], selectMode ? 1.8 : 1.5,
                selectMode ? 0.6 : 0.5,
              ]
            ]
          );
          map.setLayoutProperty(layerId, "icon-opacity", selectMode ? 0.9 : 1);
        }
      } catch (error) {
        console.error("Error loading stop icons / POIs:", error);
      }
    };

    // Set up zoom tracking
    updateZoom();
    map.on("zoom", updateZoom);
    map.on("zoomend", updateZoom);

    if (map.loaded() && map.isStyleLoaded()) {
      addStopsLayer();
    } else {
      map.once("load", addStopsLayer);
      map.once("styledata", () => {
        if (isMounted) addStopsLayer();
      });
    }

    return () => {
      isMounted = false;

      if (!map) return;

      try {
        map.off("zoom", updateZoom);
        map.off("zoomend", updateZoom);

        if (!map.isStyleLoaded()) return;

        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);

        if (map.hasImage(BUS_ICON_ID)) map.removeImage(BUS_ICON_ID);
        if (map.hasImage(BRT_ICON_ID)) map.removeImage(BRT_ICON_ID);
        if (map.hasImage(FLAMINGO_ICON_ID)) map.removeImage(FLAMINGO_ICON_ID);
      } catch (error) {
        console.warn("Cleanup warning:", error);
      }
    };
  }, [mapInstance, stops, onStopClick, selectMode]);

  return zoom !== null ? (
    <div
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        backgroundColor: selectMode 
          ? "rgba(139, 92, 246, 0.9)" 
          : "rgba(255, 255, 255, 0.9)",
        color: selectMode ? "white" : "black",
        padding: "8px 12px",
        borderRadius: "4px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        fontFamily: "monospace",
        fontSize: "14px",
        fontWeight: "bold",
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      {selectMode ? "SELECT MODE" : `Zoom: ${zoom.toFixed(2)}`}
    </div>
  ) : null;
}

export default StopMarkers;