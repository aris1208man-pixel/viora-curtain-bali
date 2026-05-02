// OpenWeatherMap API Key (Free tier)
const API_KEY = '8d5cc0e46b4af21c66a2948710284366';
const API_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('errorMessage');
const currentWeatherDiv = document.getElementById('currentWeather');
const forecastSection = document.getElementById('forecastSection');
const recentSearchesDiv = document.getElementById('recentSearches');

// Local Storage Keys
const RECENT_SEARCHES_KEY = 'weatherRecentSearches';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  searchBtn.addEventListener('click', searchWeather);
  locationBtn.addEventListener('click', getLocationWeather);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchWeather();
  });
  
  loadRecentSearches();
  // Load default city
  getWeatherByCity('Jakarta');
});

// Search Weather by City
function searchWeather() {
  const city = searchInput.value.trim();
  if (!city) {
    showError('Please enter a city name');
    return;
  }
  getWeatherByCity(city);
  saveRecentSearch(city);
}

// Get Weather by City Name
function getWeatherByCity(city) {
  showLoading(true);
  hideError();
  
  fetch(`${API_URL}/weather?q=${city}&units=metric&appid=${API_KEY}`)
    .then(res => res.json())
    .then(data => {
      if (data.cod !== 200) {
        showError(data.message);
        showLoading(false);
        return;
      }
      displayCurrentWeather(data);
      getForecast(data.coord.lat, data.coord.lon);
      showLoading(false);
    })
    .catch(err => {
      showError('Failed to fetch weather data. Please try again.');
      console.error(err);
      showLoading(false);
    });
}

// Get Weather by Coordinates (Geolocation)
function getLocationWeather() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser');
    return;
  }
  
  showLoading(true);
  hideError();
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      getWeatherByCoordinates(latitude, longitude);
    },
    (error) => {
      showError('Unable to access your location. Please enable location access.');
      showLoading(false);
    }
  );
}

// Get Weather by Coordinates
function getWeatherByCoordinates(lat, lon) {
  fetch(`${API_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`)
    .then(res => res.json())
    .then(data => {
      if (data.cod !== 200) {
        showError(data.message);
        showLoading(false);
        return;
      }
      displayCurrentWeather(data);
      getForecast(lat, lon);
      showLoading(false);
    })
    .catch(err => {
      showError('Failed to fetch weather data');
      console.error(err);
      showLoading(false);
    });
}

// Display Current Weather
function displayCurrentWeather(data) {
  const { name, sys, main, weather, wind, clouds, visibility } = data;
  
  document.getElementById('cityName').textContent = `${name}, ${sys.country}`;
  document.getElementById('date').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  document.getElementById('temp').textContent = Math.round(main.temp);
  document.getElementById('weatherDesc').textContent = weather[0].description;
  document.getElementById('humidity').textContent = `${main.humidity}%`;
  document.getElementById('windSpeed').textContent = `${wind.speed} m/s`;
  document.getElementById('pressure').textContent = `${main.pressure} hPa`;
  document.getElementById('visibility').textContent = `${(visibility / 1000).toFixed(1)} km`;
  
  // Weather Icon
  const iconCode = weather[0].icon;
  document.getElementById('weatherIcon').src = 
    `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
  
  // Show current weather section
  currentWeatherDiv.style.display = 'block';
  
  // Update search input
  searchInput.value = name;
}

// Get 5-Day Forecast
function getForecast(lat, lon) {
  fetch(`${API_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`)
    .then(res => res.json())
    .then(data => {
      displayForecast(data.list);
    })
    .catch(err => {
      console.error('Forecast error:', err);
    });
}

// Display 5-Day Forecast
function displayForecast(forecastData) {
  // Get daily forecasts (one per day at noon)
  const dailyForecasts = {};
  
  forecastData.forEach(item => {
    const date = new Date(item.dt * 1000).toLocaleDateString();
    const hour = new Date(item.dt * 1000).getHours();
    
    // Keep noon forecast (12:00)
    if (hour === 12 || !dailyForecasts[date]) {
      dailyForecasts[date] = item;
    }
  });
  
  const forecastContainer = document.getElementById('forecastContainer');
  forecastContainer.innerHTML = '';
  
  Object.values(dailyForecasts).slice(1, 6).forEach(forecast => {
    const date = new Date(forecast.dt * 1000);
    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <p class="date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
      <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" alt="Weather">
      <div class="temp-range">
        <span class="max-temp">${Math.round(forecast.main.temp_max)}°</span>
        <span class="min-temp">${Math.round(forecast.main.temp_min)}°</span>
      </div>
      <p class="description">${forecast.weather[0].main}</p>
    `;
    forecastContainer.appendChild(card);
  });
  
  forecastSection.style.display = 'block';
}

// Recent Searches
function saveRecentSearch(city) {
  let recent = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];
  // Remove duplicates and add to start
  recent = recent.filter(c => c.toLowerCase() !== city.toLowerCase());
  recent.unshift(city);
  // Keep only last 5 searches
  recent = recent.slice(0, 5);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
  loadRecentSearches();
}

function loadRecentSearches() {
  const recent = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];
  const recentList = document.getElementById('recentList');
  recentList.innerHTML = '';
  
  if (recent.length === 0) {
    recentSearchesDiv.style.display = 'none';
    return;
  }
  
  recent.forEach(city => {
    const item = document.createElement('button');
    item.className = 'recent-item';
    item.textContent = city;
    item.onclick = () => {
      getWeatherByCity(city);
    };
    recentList.appendChild(item);
  });
  
  recentSearchesDiv.style.display = 'block';
}

// UI Helpers
function showLoading(show) {
  loadingDiv.style.display = show ? 'flex' : 'none';
}

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function hideError() {
  errorDiv.style.display = 'none';
}