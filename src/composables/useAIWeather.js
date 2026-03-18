import { ref, computed, watch } from 'vue';
import apiClient from '@shared/utils/api';
import { useDateStore } from '@shared/stores/date';
import { useRealmStore } from '@shared/stores/realm';

const AI_API_URL = import.meta.env.VITE_AI_API_BASE_URL;
const APP_PREFIX = import.meta.env.VITE_APP_PREFIX || 'rf';
const STORAGE_KEY = `${APP_PREFIX}-ai-weather-history`;
const MAX_HISTORY = 10;

export const AI_ENVIRONMENTS = [
  { id: 'arctic tundra', name: 'Arctic Tundra', minLat: 55, maxLat: 90 },
  { id: 'coastal', name: 'Coastal', minLat: 0, maxLat: 90 },
  { id: 'desert', name: 'Desert', minLat: 15, maxLat: 50 },
  { id: 'grassland', name: 'Grassland', minLat: 0, maxLat: 55 },
  { id: 'mountain', name: 'Mountain', minLat: 0, maxLat: 90 },
  { id: 'open ocean', name: 'Open Ocean', minLat: 0, maxLat: 90 },
  { id: 'swamp', name: 'Swamp', minLat: 0, maxLat: 50 },
  { id: 'temperate forest', name: 'Temperate Forest', minLat: 25, maxLat: 60 },
  { id: 'tropical jungle', name: 'Tropical Jungle', minLat: 0, maxLat: 23 },
];

export function useAIWeather() {
  const dateStore = useDateStore();
  const realmStore = useRealmStore();

  const environment = ref('temperate forest');
  const latitude = ref(45);
  const additionalConditions = ref('');
  const weather = ref(null);
  const loading = ref(false);
  const error = ref('');

  const availableEnvironments = computed(() => {
    const absLat = Math.abs(latitude.value);
    return AI_ENVIRONMENTS.filter(env => absLat >= env.minLat && absLat <= env.maxLat);
  });

  watch(latitude, () => {
    const currentEnvValid = availableEnvironments.value.some(env => env.id === environment.value);
    if (!currentEnvValid && availableEnvironments.value.length > 0) {
      environment.value = availableEnvironments.value[0].id;
    }
  });

  function loadHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        environment.value = data.environment || 'temperate forest';
        latitude.value = data.latitude ?? 45;
        additionalConditions.value = data.additionalConditions || '';
        return data.history || [];
      }
    } catch (e) {
      console.error('Failed to load AI weather history:', e);
    }
    return [];
  }

  function saveHistory(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      environment: environment.value,
      latitude: latitude.value,
      additionalConditions: additionalConditions.value,
      history: history.slice(-MAX_HISTORY)
    }));
  }

  function getWeatherForDate(y, m, d) {
    const history = loadHistory();
    return history.find(h => h.date.y === y && h.date.m === m && h.date.d === d);
  }

  function formatPreviousWeather(history, currentDate) {
    const recent = history
      .filter(h => {
        const dayDiff = (currentDate.y * 365 + currentDate.m * 30 + currentDate.d) -
                        (h.date.y * 365 + h.date.m * 30 + h.date.d);
        return dayDiff > 0 && dayDiff <= 3;
      })
      .slice(-3);

    if (recent.length === 0) return '';

    return recent.map(h => {
      const w = h.weather;
      const tempStr = typeof w.temperature === 'object'
        ? `${w.temperature.low}°C to ${w.temperature.high}°C`
        : w.temperature;
      return `${dateStore.arMonths[h.date.m].Name} ${h.date.d}: ${w.conditions}, ${tempStr}, ${w.precipitation}, ${w.wind}`;
    }).join('\n');
  }

  function loadCachedWeather() {
    const date = dateStore.date;
    if (date) {
      const cached = getWeatherForDate(date.y, date.m, date.d);
      if (cached) {
        weather.value = cached.weather;
        if (cached.environment) environment.value = cached.environment;
        if (cached.latitude !== undefined) latitude.value = cached.latitude;
      }
    }
  }

  async function generateWeather(targetDate = null) {
    const date = targetDate || dateStore.date;
    if (!date) {
      error.value = 'Date not available';
      return;
    }

    const cached = getWeatherForDate(date.y, date.m, date.d);
    if (cached) {
      weather.value = cached.weather;
      return;
    }

    loading.value = true;
    error.value = '';

    try {
      const history = loadHistory();
      const previousWeather = formatPreviousWeather(history, date);

      const baseUrl = AI_API_URL || import.meta.env.VITE_API_BASE_URL;
      const response = await apiClient.post(`${baseUrl}/ai/weather`, {
        realmId: realmStore.activeRealmId,
        gameMonth: dateStore.arMonths[date.m].Name,
        monthIndex: date.m,
        totalMonths: dateStore.arMonths.length,
        day: date.d,
        year: date.y,
        environment: environment.value,
        latitude: latitude.value,
        additionalConditions: additionalConditions.value || undefined,
        previousWeather: previousWeather || undefined
      });

      weather.value = response.data;

      history.push({
        date: { y: date.y, m: date.m, d: date.d },
        weather: response.data,
        environment: environment.value,
        latitude: latitude.value
      });
      saveHistory(history);

    } catch (e) {
      error.value = e.response?.data?.error || 'Failed to generate weather';
      console.error('Weather generation failed:', e);
    } finally {
      loading.value = false;
    }
  }

  async function regenerateWeather() {
    const date = dateStore.date;
    if (!date) return;

    const currentLatitude = latitude.value;
    const currentEnvironment = environment.value;
    const currentAdditionalConditions = additionalConditions.value;

    const history = loadHistory().filter(
      h => !(h.date.y === date.y && h.date.m === date.m && h.date.d === date.d)
    );

    latitude.value = currentLatitude;
    environment.value = currentEnvironment;
    additionalConditions.value = currentAdditionalConditions;

    saveHistory(history);

    weather.value = null;
    await generateWeather();
  }

  async function onDateChange(options = {}) {
    const { date: providedDate, autoGenerate = false, canGenerate = false } = options;
    const date = providedDate || dateStore.date;
    if (date) {
      const cached = getWeatherForDate(date.y, date.m, date.d);
      if (cached) {
        weather.value = cached.weather;
      } else {
        weather.value = null;
        if (autoGenerate && canGenerate) {
          await generateWeather(date);
        }
      }
    }
  }

  loadCachedWeather();

  return {
    environment,
    latitude,
    additionalConditions,
    weather,
    loading,
    error,
    generateWeather,
    regenerateWeather,
    onDateChange,
    loadCachedWeather,
    availableEnvironments
  };
}
