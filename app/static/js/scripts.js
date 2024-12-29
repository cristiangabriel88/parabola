document.addEventListener("DOMContentLoaded", async () => {
  console.log("Parabola app loaded.");

  const locationInput = document.getElementById("location");
  const suggestionsBox = document.getElementById("suggestions");
  const form = document.getElementById("locationForm");
  let cityData = [];

  if (!locationInput || !form) {
    console.log("No location input or form found on this page.");
    return;
  }

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

          // Remove existing latitude/longitude inputs (if any)
          const existingLat = document.querySelector("input[name='latitude']");
          const existingLng = document.querySelector("input[name='longitude']");
          if (existingLat) existingLat.remove();
          if (existingLng) existingLng.remove();

          // Add new hidden fields for latitude and longitude
          form.appendChild(createHiddenInput("latitude", suggestion.latitude));
          form.appendChild(
            createHiddenInput("longitude", suggestion.longitude)
          );

          console.log("Selected Coordinates:", {
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
          });
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

  let suggestionClicked = false;
  let isLocationValidated = false;

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

  locationInput.addEventListener("blur", () => {
    if (suggestionClicked) {
      suggestionClicked = false; // Reset the flag after a valid click
      isLocationValidated = true; // Mark as validated
      return;
    }

    const query = locationInput.value.trim();
    const results = searchCities(query);

    // Check if the input matches one of the suggestions
    const isValid = results.some(
      (result) =>
        result.city.toLowerCase() === query.split(",")[0]?.toLowerCase().trim()
    );

    if (!isValid && query.length > 0) {
      showModal("Please select a valid location from the suggestions.");
      locationInput.value = ""; // Clear invalid input
      isLocationValidated = false; // Reset validation flag
    } else {
      isLocationValidated = true; // Mark as validated
    }
  });

  // Handle suggestion clicks
  suggestionsBox.addEventListener("mousedown", () => {
    suggestionClicked = true; // Set the flag when a suggestion is clicked
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission behavior

    // Prevent submission if location input is invalid
    if (!isLocationValidated) {
      showModal("Please select a valid location from the suggestions.");
      return; // Prevent form submission
    }

    const formData = new FormData(form);

    // Convert date to ISO format
    const dob = formData.get("dob");
    formData.set("dob", convertDateToISO(dob));

    try {
      const response = await fetch("/calculate", {
        method: "POST",
        body: formData,
      });

      if (response.redirected) {
        // Redirect to the new page
        window.location.href = response.url;
      } else if (response.ok) {
        // Fallback for successful HTML rendering
        const resultHtml = await response.text();
        document.body.innerHTML = resultHtml;
      } else {
        // Log error response
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

function showModal(message) {
  const modal = document.getElementById("customModal");
  const modalMessage = document.getElementById("modalMessage");
  const closeModal = document.getElementById("closeModal");

  // Set the message
  modalMessage.textContent = message;

  // Display the modal
  modal.style.display = "flex";

  // Close the modal on button click
  closeModal.onclick = () => {
    modal.style.display = "none";
  };

  // Close the modal when clicking outside the modal content
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
}
