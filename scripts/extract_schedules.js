import fs from 'fs-extra';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const PDF_DIR = './data/pdfs';
const STOPS_FILE = './data/stops.json';
const OUTPUT_FILE = './data/schedules.json';

// Carregar paragens conhecidas para ajudar no reconhecimento
const stopsData = fs.readJsonSync(STOPS_FILE);
const knownStops = stopsData.flatMap(cat => cat.stops.map(s => s.name.toUpperCase()));

async function extractFromPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  const text = data.text;
  const lines = text.split('\n');
  
  const fileName = path.basename(filePath, '.pdf');
  const schedule = {
    line: fileName,
    lineName: `Carreira ${fileName}`,
    stops: [],
    trips: []
  };

  const stopRows = [];

  lines.forEach(line => {
    const upperLine = line.toUpperCase();
    // Encontrar se a linha contém uma paragem conhecida
    const matchedStop = knownStops.find(stop => upperLine.includes(stop));
    
    // Encontrar todas as horas na linha (formato HH:MM)
    const times = line.match(/\d{2}:\d{2}/g);

    if (matchedStop && times && times.length > 0) {
      if (!schedule.stops.includes(matchedStop)) {
        schedule.stops.push(matchedStop);
        stopRows.push(times);
      }
    }
  });

  // Pivotar dados: transformar linhas de paragens em colunas de viagens
  if (stopRows.length > 0) {
    const numTrips = Math.max(...stopRows.map(r => r.length));
    for (let i = 0; i < numTrips; i++) {
      const tripTimes = stopRows.map(row => row[i] || "--:--");
      schedule.trips.push({
        id: `${fileName}_trip_${i}`,
        dayType: "business",
        times: tripTimes
      });
    }
  }

  return schedule;
}

async function run() {
  const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf') && f !== 'mapa_de_rede.pdf');
  const allSchedules = [];

  for (const file of files) {
    console.log(`Processing ${file}...`);
    try {
      const schedule = await extractFromPdf(path.join(PDF_DIR, file));
      if (schedule.stops.length > 0) {
        allSchedules.push(schedule);
      }
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }

  fs.writeJsonSync(OUTPUT_FILE, allSchedules, { spaces: 2 });
  console.log(`Successfully extracted ${allSchedules.length} schedules to ${OUTPUT_FILE}`);
}

run();
