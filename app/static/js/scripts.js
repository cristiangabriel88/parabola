document.addEventListener("DOMContentLoaded", async () => {
  console.log("Parabola app loaded.");

  const locationInput = document.getElementById("location");
  const suggestionsBox = document.getElementById("suggestions");
  const form = document.getElementById("locationForm");
  let cityData = [];

  // Fetch JSON data on page load
  try {
    const response = await fetch("/static/data/countries+states+cities.json");
    cityData = await response.json();
    console.log("JSON loaded");
  } catch (error) {
    console.error("Error loading city data:", error);
    return;
  }

  // Function to search the JSON data
  function searchCities(query) {
    const lowerQuery = query.toLowerCase();
    let matchedCities = [];

    cityData.forEach((country) => {
      if (country.states) {
        country.states.forEach((state) => {
          if (state.cities) {
            const matchingCities = state.cities
              .filter((city) => city.name.toLowerCase().includes(lowerQuery))
              .map((city) => ({
                city: city.name,
                state: state.name,
                country: country.name,
                latitude: city.latitude,
                longitude: city.longitude,
              }));

            matchedCities = matchedCities.concat(matchingCities);
          }
        });
      }
    });

    return matchedCities.sort((a, b) => {
      const aCityMatch = a.city.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
      const bCityMatch = b.city.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
      return aCityMatch - bCityMatch;
    });
  }

  function displaySuggestions(suggestions, inputElement, suggestionsBox) {
    suggestionsBox.innerHTML = ""; // Clear previous suggestions

    if (suggestions.length > 0) {
      suggestionsBox.style.display = "block"; // Make the box visible
      suggestions.forEach((suggestion) => {
        const suggestionElement = document.createElement("div");
        suggestionElement.textContent = `${suggestion.city}, ${suggestion.state}, ${suggestion.country}`;
        suggestionElement.dataset.latitude = suggestion.latitude;
        suggestionElement.dataset.longitude = suggestion.longitude;

        suggestionElement.addEventListener("click", () => {
          inputElement.value = `${suggestion.city}, ${suggestion.state}, ${suggestion.country}`;
          suggestionsBox.innerHTML = ""; // Clear suggestions
          suggestionsBox.style.display = "none"; // Hide the box
          console.log("Selected Coordinates:", {
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
          });

          // Add hidden fields for latitude and longitude
          form.appendChild(createHiddenInput("latitude", suggestion.latitude));
          form.appendChild(
            createHiddenInput("longitude", suggestion.longitude)
          );
        });

        suggestionsBox.appendChild(suggestionElement);
      });
    } else {
      suggestionsBox.style.display = "none"; // Hide the box if no suggestions
    }
  }

  function createHiddenInput(name, value) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    return input;
  }

  locationInput.addEventListener("input", () => {
    const query = locationInput.value.trim();

    if (query.length < 2) {
      suggestionsBox.style.display = "none"; // Hide the box if input is too short
      return;
    }

    const results = searchCities(query);
    displaySuggestions(results, locationInput, suggestionsBox);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".input-group")) {
      suggestionsBox.style.display = "none"; // Hide the box when clicking outside
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission behavior

    const formData = new FormData(form);

    // Convert date to ISO format
    const dob = formData.get("dob");
    formData.set("dob", convertDateToISO(dob));

    // Send the data to the backend
    try {
      const response = await fetch("/calculate", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const resultHtml = await response.text(); // Expecting rendered HTML
        document.body.innerHTML = resultHtml; // Replace the page with results
      } else {
        const errorMessage = await response.text();
        console.error("Error:", errorMessage);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  });
});

function convertDateToISO(dateStr) {
  const [day, month, year] = dateStr.split("/");
  return `${year}-${month}-${day}`;
}

function validateDate(input) {
  let value = input.value.replace(/[^0-9/]/g, ""); // Allow only digits and slashes

  // Automatically insert slashes at appropriate positions
  if (value.length >= 2 && value[2] !== "/") {
    value = value.slice(0, 2) + "/" + value.slice(2);
  }
  if (value.length >= 5 && value[5] !== "/") {
    value = value.slice(0, 5) + "/" + value.slice(5);
  }

  const parts = value.split("/");
  let day = parts[0];
  let month = parts[1];
  let year = parts[2];

  if (day && parseInt(day, 10) > 31) day = "31";
  if (month && parseInt(month, 10) > 12) month = "12";
  if (year && parseInt(year, 10) > 2999) year = "2999";

  input.value = [day, month, year].filter(Boolean).join("/").slice(0, 10);
}

function validateTime(input) {
  let value = input.value.replace(/[^0-9:]/g, ""); // Allow only digits and colon

  if (value.length >= 2 && value[2] !== ":") {
    value = value.slice(0, 2) + ":" + value.slice(2);
  }

  const parts = value.split(":");
  let hours = parts[0];
  let minutes = parts[1];

  if (hours && parseInt(hours, 10) > 23) hours = "23";
  if (minutes && parseInt(minutes, 10) > 59) minutes = "59";

  input.value = [hours, minutes].filter(Boolean).join(":").slice(0, 5);
}
