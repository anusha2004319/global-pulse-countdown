// Service for fetching real-time global pulse data

const USGS_API = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';
// OpenWeather requires an API key - for now we'll provide a mock fallback or use a public one if available
const WEATHER_API = 'https://api.openweathermap.org/data/2.5/weather';

export interface EarthquakeData {
  magnitude: number;
  location: string;
  count: number;
}

export interface WeatherData {
  condition: string;
  temp: number;
  humidity: number;
  windSpeed: number;
}

export async function fetchEarthquakeData(): Promise<EarthquakeData> {
  try {
    const response = await fetch(USGS_API);
    const data = await response.json();
    const features = data.features || [];
    const avgMag = features.length > 0 
      ? features.reduce((acc: number, curr: any) => acc + curr.properties.mag, 0) / features.length 
      : 0;
    
    return {
      magnitude: avgMag,
      location: features[0]?.properties?.place || 'San Francisco, CA', // fallback example
      count: features.length
    };
  } catch (err) {
    console.warn('USGS API failed, using mock data', err);
    return { magnitude: 2.5, location: 'Global Pulse', count: 12 };
  }
}

export async function fetchWeatherData(lat: number = 51.5074, lon: number = 0.1278): Promise<WeatherData> {
  // Using a mock-fallback strategy because of API keys
  try {
    // OpenWeather usually needs an API key: ?lat={lat}&lon={lon}&appid={API_KEY}
    // We'll simulate data if no VITE_WEATHER_API_KEY is found
    const apiKey = (import.meta as any).env.VITE_WEATHER_API_KEY;
    if (!apiKey) throw new Error('No API Key');

    const response = await fetch(`${WEATHER_API}?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
    const data = await response.json();

    return {
      condition: data.weather[0].main,
      temp: data.main.temp,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed
    };
  } catch (err) {
    return {
      condition: 'Clear',
      temp: 22,
      humidity: 45,
      windSpeed: 3.5
    };
  }
}

export async function fetchFlightData() {
  // Mocking flight data for Level 10
  return Array.from({ length: 5 }, () => ({
    id: Math.random().toString(36).substr(2, 5),
    x: (Math.random() - 0.5) * 100,
    z: (Math.random() - 0.5) * 100,
    y: 20 + Math.random() * 10,
    speed: 0.1 + Math.random() * 0.2
  }));
}
