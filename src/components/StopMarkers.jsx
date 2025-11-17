// src/components/StopMarkers.jsx
import { useEffect } from "react";
import { useMap } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import busstopIcon from '../assets/busstop.png';



function StopMarkers({ stops, onStopClick }) {
  const mapInstance = useMap();

  useEffect(() => {
    const map = mapInstance.current?.getMap();
    
    if (!map || !stops?.length) return;

    const sourceId = 'stops-source';
    const layerId = 'stops-layer';
    const iconId = 'busstop-icon';

    const addStopsLayer = async () => {
      if (map.getSource(sourceId)) return;

      try {
        // Load image as blob
        const response = await fetch(busstopIcon);
        const blob = await response.blob();
        const imageBitmap = await createImageBitmap(blob);

        // Add the image to the map
        if (!map.hasImage(iconId)) {
          map.addImage(iconId, imageBitmap);
        }

        // Create GeoJSON data
        const geojsonData = {
          type: 'FeatureCollection',
          features: stops.map(stop => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [Number(stop.stop_lon), Number(stop.stop_lat)]
            },
            properties: {
              name: stop.stop_name,
              code: stop.stop_code
            }
          }))
        };

        // Add source
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData
        });

        // Add symbol layer with custom icon
        map.addLayer({
          id: layerId,
          type: 'symbol',
          source: sourceId,
          minzoom: 15, // Only show at zoom 14 and above
          maxzoom: 18, // Hide at zoom 24+ (adjust as needed)
          layout: {
            'icon-image': iconId,
            'icon-size': 0.8,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        });

        // Add popup on click
        map.on('click', layerId, (e) => {
          if (!e.features || !e.features[0]) return;
          
          const coordinates = e.features[0].geometry.coordinates.slice();
          const { name, code } = e.features[0].properties;

          new maplibregl.Popup()
            .setLngLat(coordinates)
            .setHTML(`<b>${name}</b><br/>Code: ${code}`)
            .addTo(map);
            onStopClick?.({ stop_name: name, stop_code: code });
        });

        // Change cursor on hover
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });

      } catch (error) {
        console.error('Error loading bus stop icon:', error);
      }
    };

    if (map.loaded()) {
      addStopsLayer();
    } else {
      map.once('load', addStopsLayer);
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      if (map.hasImage(iconId)) map.removeImage(iconId);
    };
  }, [mapInstance, stops]);

  return null;
}

export default StopMarkers;