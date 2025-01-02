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
    const normalizedQuery = query
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    // Filter and process only necessary data
    return cityData
      .flatMap((country) => {
        if (!country.states) return [];
        return country.states.flatMap((state) => {
          if (!state.cities) return [];
          return state.cities
            .filter((city) =>
              city.name
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .includes(normalizedQuery)
            )
            .map((city) => ({
              city: city.name,
              state: state.name,
              country: country.name,
              latitude: city.latitude,
              longitude: city.longitude,
            }));
        });
      })
      .sort((a, b) => {
        const aCityMatch = a.city
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .startsWith(normalizedQuery)
          ? 0
          : 1;
        const bCityMatch = b.city
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .startsWith(normalizedQuery)
          ? 0
          : 1;
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

  let debounceTimer;

  locationInput.addEventListener("input", () => {
    clearTimeout(debounceTimer); // Clear the previous timer
    debounceTimer = setTimeout(() => {
      const query = locationInput.value.trim();

      if (query.length < 2) {
        suggestionsBox.style.display = "none"; // Hide the box if input is too short
        return;
      }

      const results = searchCities(query);
      displaySuggestions(results, locationInput, suggestionsBox);
    }, 200); // Wait 200ms before running the search logic
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

// Load the astrology data JSON file
async function loadAstroData() {
  const response = await fetch("/static/data/astrology.json");
  return await response.json();
}

// Function to populate and open the detailed carousel
async function openDetailedCarousel(mainCarouselCards, currentIndex) {
  const astroData = await loadAstroData();
  const wrapper = document.getElementById("detailedCarouselContainer");
  const carouselInner = document.querySelector(".detailedCarousel-inner");

  // Get current card info
  const currentCard = mainCarouselCards[currentIndex];
  const { cardType, cardKey } = currentCard;

  // Clear existing carousel items
  carouselInner.innerHTML = "";

  // Fetch current data
  const data = astroData[cardType][cardKey];
  if (!data) {
    console.error(
      `No data found for cardType: ${cardType}, cardKey: ${cardKey}`
    );
    return;
  }

  // Create the current detailed carousel content
  const item = document.createElement("div");
  item.className = "carousel-item active";
  item.innerHTML = `
		<img src="/static/images/${
      cardType === "elements" ? "elements-large" : `${cardType}-large`
    }/${cardKey}.png" alt="${data.title}">
		<div class="detailedCarousel-caption">
		  <h5>${data.title}</h5>
		  <p>${data.description}</p>
		</div>
	  `;
  carouselInner.appendChild(item);

  // Update navigation previews
  updateMiniCards(mainCarouselCards, currentIndex);

  const currentCardContainer = document.querySelector(
    ".detailedCarousel-current-card"
  );

  // Add the card type as a title above the image
  let titleElement = currentCardContainer.querySelector(".current-card-title");
  if (!titleElement) {
    // Create a title element if it doesn't already exist
    titleElement = document.createElement("h4");
    titleElement.classList.add("current-card-title");
    imageElement.insertAdjacentElement("beforebegin", titleElement); // Add title right before the image
  }

  // Capitalize the first letter of cardType, remove the last character, and set it as the text content
  const singularCardType =
    cardType.charAt(0).toUpperCase() + cardType.slice(1, -1);
  titleElement.textContent = singularCardType;

  // Set the image source
  const imageElement = currentCardContainer.querySelector(".current-card-img");
  imageElement.src = `/static/images/${
    cardType === "elements" ? "elements" : `${cardType}`
  }/${cardKey}.png`;

  // Add the card key as a subtitle under the image
  let subtitleElement = currentCardContainer.querySelector(
    ".current-card-subtitle"
  );
  if (!subtitleElement) {
    // Create a subtitle element if it doesn't already exist
    subtitleElement = document.createElement("p");
    subtitleElement.classList.add("current-card-subtitle");
    imageElement.insertAdjacentElement("afterend", subtitleElement); // Add subtitle right after the image
  }

  subtitleElement.textContent =
    cardKey.charAt(0).toUpperCase() + cardKey.slice(1); // Set the card key as the text content with a capital letter at the front

  // Show the wrapper
  wrapper.classList.add("show");

  // Add event listener for the close button
  document.getElementById("closeDetailedCarousel").onclick = function () {
    wrapper.classList.remove("show");
    document.body.classList.remove("carousel-active");
    document.body.style.overflow = ""; // Restore body scroll
  };

  // Disable body scroll
  document.body.classList.add("carousel-active");
  document.body.style.overflow = "hidden";
}

function updateMiniCards(mainCarouselCards, currentIndex) {
  const prevIndex =
    (currentIndex - 1 + mainCarouselCards.length) % mainCarouselCards.length;
  const nextIndex = (currentIndex + 1) % mainCarouselCards.length;

  // Update previous card mini-card
  const prevCard = mainCarouselCards[prevIndex];
  const prevMini = document.querySelector(".detailedCarousel-mini-prev");
  prevMini.querySelector(".mini-card-img").src = `/static/images/${
    prevCard.cardType === "elements" ? "elements" : `${prevCard.cardType}`
  }/${prevCard.cardKey}.png`;
  prevMini.querySelector(".mini-card-type").innerText = capitalizeFirstLetter(
    prevCard.cardType
  );
  prevMini.onclick = () => openDetailedCarousel(mainCarouselCards, prevIndex);

  // Update next card mini-card
  const nextCard = mainCarouselCards[nextIndex];
  const nextMini = document.querySelector(".detailedCarousel-mini-next");
  nextMini.querySelector(".mini-card-img").src = `/static/images/${
    nextCard.cardType === "elements" ? "elements" : `${nextCard.cardType}`
  }/${nextCard.cardKey}.png`;
  nextMini.querySelector(".mini-card-type").innerText = capitalizeFirstLetter(
    nextCard.cardType
  );
  nextMini.onclick = () => openDetailedCarousel(mainCarouselCards, nextIndex);
}

// Utility function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Function to get all cards from the main carousel
function getMainCarouselCards() {
  const cards = [];
  document
    .querySelectorAll(".featured-carousel .card-wrapper")
    .forEach((card) => {
      const cardType = card.getAttribute("data-card-type");
      const cardKey = card.getAttribute("data-card-key");

      if (cardType && cardKey) {
        cards.push({ cardType, cardKey });
      }
    });
  return cards;
}

// Add click listeners to the cards
document
  .querySelectorAll(".featured-carousel .card-wrapper")
  .forEach((card, index) => {
    card.addEventListener("click", () => {
      const mainCarouselCards = getMainCarouselCards();
      openDetailedCarousel(mainCarouselCards, index);
      console.log(
        "Card type: " +
          card.getAttribute("data-card-type") +
          " Card Key: " +
          card.getAttribute("data-card-key")
      );
    });
  });

document
  .querySelectorAll(".owl-nav .owl-prev, .owl-nav .owl-next")
  .forEach((button) => {
    button.addEventListener("mouseup", () => {
      button.blur(); // Remove focus from the button
    });
  });
