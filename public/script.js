"use strict";

const temperatureElement = document.getElementById("temperature");
const cityElement = document.getElementById("city");

window.addEventListener("DOMContentLoaded", function () {
  // Initialization
  initializePage();

  // Add listeners
  document.getElementById("säätänää-form").addEventListener("submit", onSubmit);
  document.getElementById("geo-button").addEventListener("click", onGeoClick);
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
  fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
    {
      mode: "cors",
    }
  )
    .then((res) => {
      return res.json();
    })
    .then((res) => {
      cityElement.textContent = res.address.city || res.address.town;
    });

  fetch(
    "https://api.open-meteo.com/v1/forecast?latitude=" +
      coords.latitude +
      "&longitude=" +
      coords.longitude +
      "&current=temperature_2m",
    {
      mode: "cors",
    }
  )
    .then((res) => {
      return res.json();
    })
    .then((res) => {
      temperatureElement.textContent = `${res.current.temperature_2m} ${res.current_units.temperature_2m}`;
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
  return fetch("fi.json")
    .then((res) => res.json())
    .then((data) => {
      const city = data.find(
        (item) => item.city.toLowerCase() === cityName.toLowerCase()
      );

      if (!city) {
        throw new Error("City not found");
      }

      return { latitude: city.lat, longitude: city.lng };
    });
}
