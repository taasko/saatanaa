"use strict";

let weatherCodeMapping;
const weatherCodeMappingPromise = fetch("ww.json")
  .then((res) => res.json())
  .then((data) => (weatherCodeMapping = data))
  .catch((error) => console.error("Error fetching weather codes:", error));

let cityCoordsMapping;
const cityCoordsMappingPromise = fetch("fi.json")
  .then((res) => res.json())
  .then((data) => (cityCoordsMapping = data))
  .catch((error) => console.error("Error fetching city coordinates:", error));

window.addEventListener("DOMContentLoaded", function () {
  // Initialization
  initializePage();

  // Add listeners
  const form = document.getElementById("säätänää-form");
  if (form) {
    form.addEventListener("submit", onSubmit);
  }

  const geoButton = document.getElementById("geo-button");
  if (geoButton) {
    geoButton.addEventListener("click", onGeoClick);
  }
});

/**
 * @returns {void}
 */
function initializePage() {
  const params = new URLSearchParams(window.location.search);
  const city = params.get("city");

  if (city) {
    geoFindMe(city);
  }
}

/**
 * @param {SubmitEvent} ev
 * @returns {void}
 */
function onSubmit(ev) {
  ev.preventDefault();

  const formData = new FormData(ev.target);
  const city = formData.get("city");

  geoFindMe(city);

  const params = new URLSearchParams(window.location.search);
  params.set("city", city);

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  history.pushState(null, "", newUrl);

  ev.target.reset();
}

function onGeoClick() {
  geoFindMe();
}

/**
 * @param {Coords|GeolocationCoordinates} coords
 * @returns {Promise<void>}
 */
function getWeather(coords) {
  openStreetMapReverseRequest(coords).then((res) => {
    const cityElement = document.getElementById("city");

    if (cityElement) {
      cityElement.textContent = res.cityText;
    }
  });

  openMeteoForecastRequest(coords).then((res) => {
    const temperatureElement = document.getElementById("temperature");
    const weatherInfoElement = document.getElementById("weather-info");

    if (temperatureElement) {
      temperatureElement.textContent = res.temperatureText;
    }

    if (weatherInfoElement) {
      weatherInfoElement.textContent = res.weatherText;
    }
  });
}

/**
 * @typedef {Object} ForecastResponse
 * @property {string} temperatureText
 * @property {string} weatherText
 */

/**
 * @param {Coords|GeolocationCoordinates} coords
 * @returns {Promise<ForecastResponse>}
 */
function openMeteoForecastRequest(coords) {
  const forecastUrl = new URL("v1/forecast", "https://api.open-meteo.com");

  const forecastParams = new URLSearchParams({
    latitude: coords.latitude,
    longitude: coords.longitude,
    current: "temperature_2m,weather_code",
  });

  forecastUrl.search = forecastParams.toString();

  return Promise.all([
    apiRequest(forecastUrl.toString()),
    weatherCodeMappingPromise,
  ]).then(([res]) => {
    return {
      temperatureText: `${res.current.temperature_2m} ${res.current_units.temperature_2m}`,
      weatherText: weatherCodeMapping[res.current.weather_code],
    };
  });
}

/**
 * @typedef {Object} ReverseResponse
 * @property {string} cityText
 */

/**
 * @param {Coords|GeolocationCoordinates} coords
 * @returns {Promise<ReverseResponse>}
 */
function openStreetMapReverseRequest(coords) {
  const reverseUrl = new URL("reverse", "https://nominatim.openstreetmap.org");

  const reverseParams = new URLSearchParams({
    lat: coords.latitude,
    lon: coords.longitude,
    format: "json",
  });

  reverseUrl.search = reverseParams.toString();

  return apiRequest(reverseUrl.toString()).then((res) => ({
    cityText: res.address.city || res.address.town,
  }));
}

/**
 * @param {string} url
 * @returns {Promise<any>}
 */
function apiRequest(url) {
  return fetch(url, { mode: "cors" }).then((res) => {
    if (!res.ok) {
      throw new Error(res.statusText);
    }

    return res.json();
  });
}

/**
 * @param {string|null} city
 * @returns void
 */
function geoFindMe(city) {
  if (city) {
    cityToCoordinates(city).then(getWeather);
  } else {
    if (!navigator.geolocation) {
      return console.debug("Geolocation is not supported by your browser");
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        getWeather(position.coords);
      },
      () => {
        console.debug("Unable to retrieve your location");
      }
    );
  }
}

/**
 * @typedef {Object} Coords
 * @property {number} latitude - The latitude of the coordinates.
 * @property {number} longitude - The longitude of the coordinates.
 */

/**
 * @param {string} cityName
 * @returns {Promise<Coords>}
 * @throws {Error}
 */
function cityToCoordinates(cityName) {
  return cityCoordsMappingPromise.then(() => {
    const city = cityCoordsMapping.find(
      (item) => item.city.toLowerCase() === cityName.toLowerCase()
    );

    if (!city) {
      throw new Error("City not found");
    }

    return { latitude: city.lat, longitude: city.lng };
  });
}
