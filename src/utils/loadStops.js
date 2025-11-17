// src/utils/loadStops.js
import Papa from "papaparse";

export async function loadStops() {
  const response = await fetch("/p87/public/stops.csv");
  const csvText = await response.text();

  return new Promise((resolve) => {
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      complete: (results) => resolve(results.data),
    });
  });
}
