document.addEventListener("DOMContentLoaded", async () => {
  console.log("Parabola app loaded.");

  const locationInput = document.getElementById("location");
  const suggestionsBox = document.getElementById("suggestions");
  const form = document.getElementById("locationForm");
  let cityData = [];
  let currentSuggestionIndex = -1; // Track highlighted suggestion
  let manualSelection = false; // Flag to track manual selection
  let isSubmitting = false; // Prevent modal during form submission
  let isMouseDownOnCard = false; // Track if mouse is down on a card
  let mouseDownCardIndex = -1; // Track the index of the card where the mouse was pressed down

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

  function displaySuggestions(suggestions) {
    suggestionsBox.innerHTML = ""; // Clear previous suggestions

    if (suggestions.length > 0) {
      suggestionsBox.style.display = "block"; // Make the box visible
      suggestions.forEach((suggestion) => {
        const suggestionElement = document.createElement("div");
        suggestionElement.textContent = `${suggestion.city}, ${suggestion.state}, ${suggestion.country}`;
        suggestionElement.dataset.latitude = suggestion.latitude;
        suggestionElement.dataset.longitude = suggestion.longitude;

        suggestionElement.addEventListener("mousedown", (event) => {
          event.preventDefault(); // Prevent the blur event from clearing the field
          handleSuggestionSelection(suggestion);
        });

        suggestionsBox.appendChild(suggestionElement);
      });
    } else {
      suggestionsBox.style.display = "none"; // Hide the box if no suggestions
    }
  }

  function handleSuggestionSelection(suggestion) {
    manualSelection = true; // Set the flag for manual selection
    isLocationValidated = true; // Mark as validated

    locationInput.value = `${suggestion.city}, ${suggestion.state}, ${suggestion.country}`;
    suggestionsBox.innerHTML = ""; // Clear suggestions
    suggestionsBox.style.display = "none"; // Hide the suggestions box

    // Remove existing latitude/longitude inputs (if any)
    document
      .querySelectorAll("input[name='latitude'], input[name='longitude']")
      .forEach((el) => el.remove());

    // Add new hidden fields for latitude and longitude
    form.appendChild(createHiddenInput("latitude", suggestion.latitude));
    form.appendChild(createHiddenInput("longitude", suggestion.longitude));

    console.log("Selected Coordinates:", {
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });

    // Move focus to the next field
    const nextField = document.getElementById("dob");
    if (nextField) nextField.focus();
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

  locationInput.addEventListener("keydown", (event) => {
    const suggestionElements = suggestionsBox.querySelectorAll("div");
    if (suggestionElements.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (currentSuggestionIndex < suggestionElements.length - 1) {
          currentSuggestionIndex++;
          highlightSuggestion(suggestionElements, currentSuggestionIndex);
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (currentSuggestionIndex > 0) {
          currentSuggestionIndex--;
          highlightSuggestion(suggestionElements, currentSuggestionIndex);
        }
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (currentSuggestionIndex >= 0) {
          const selectedSuggestion = suggestionElements[currentSuggestionIndex];
          const suggestion = {
            city: selectedSuggestion.textContent.split(",")[0].trim(),
            state: selectedSuggestion.textContent.split(",")[1].trim(),
            country: selectedSuggestion.textContent.split(",")[2].trim(),
            latitude: selectedSuggestion.dataset.latitude,
            longitude: selectedSuggestion.dataset.longitude,
          };
          handleSuggestionSelection(suggestion);
        }
      }
    }
  });

  function highlightSuggestion(elements, index) {
    elements.forEach((el, i) => {
      el.classList.toggle("highlighted", i === index);
      if (i === index) {
        el.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      }
    });
  }

  locationInput.addEventListener("blur", () => {
    // If a suggestion was manually selected, skip validation
    if (manualSelection) {
      manualSelection = false; // Reset the flag
      return; // Skip further validation
    }

    const query = locationInput.value.trim();
    const results = searchCities(query);

    const isValid = results.some(
      (result) =>
        result.city.toLowerCase() === query.split(",")[0]?.toLowerCase().trim()
    );

    if (!isValid && query.length > 0) {
      showModal("Please select a valid location from the suggestions.");
      locationInput.value = ""; // Clear invalid input
      isLocationValidated = false;
    } else {
      isLocationValidated = true; // Mark as valid if input matches a suggestion
    }
  });

  const submitButton = document.querySelector(".btn-submit");

  // Handle suggestion clicks
  suggestionsBox.addEventListener("mousedown", () => {
    suggestionClicked = true; // Set the flag when a suggestion is clicked
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission behavior

    const timeInput = document.getElementById("hour");
    if (timeInput && timeInput.value.length === 2) {
      timeInput.value += ":00"; // Append default minutes if missing
    }

    submitButton.textContent = "Generating...";
    submitButton.classList.add("pulsing");
    submitButton.disabled = true;

    // Prevent submission if location input is invalid
    if (!isLocationValidated) {
      showModal("Please select a valid location from the suggestions");
      return; // Prevent form submission
    }

    isSubmitting = true;

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
    } finally {
      isSubmitting = false; // Reset submission flag
    }
  });

  let modalActive = false;

  function showModal(message) {
    const modal = document.getElementById("customModal");
    const modalMessage = document.getElementById("modalMessage");
    const closeModal = document.getElementById("closeModal");

    // Set the modal message
    modalMessage.textContent = message;

    // Display the modal
    modal.style.display = "flex";

    // Ensure focus is on the "OK" button
    setTimeout(() => closeModal.focus(), 0);

    // Function to close the modal and refocus on the location input
    const closeModalHandler = () => {
      modal.style.display = "none";
      locationInput.focus(); // Refocus on the location input
    };

    // Close the modal when the "OK" button is clicked
    closeModal.onclick = closeModalHandler;

    // Close the modal when clicking outside the modal content
    window.onclick = (event) => {
      if (event.target === modal) {
        closeModalHandler();
      }
    };

    // Close the modal on "Enter" key press
    closeModal.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        closeModalHandler();
      }
    });
  }
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

  // Validate day
  if (day && parseInt(day, 10) > 31) day = "31";

  // Validate month
  if (month && parseInt(month, 10) > 12) month = "12";

  // Validate year
  if (year) {
    year = parseInt(year, 10);
    if (year === 0) year = 1; // Set minimum year to 0001
    if (year > 2999) year = 2999; // Set maximum year to 2999
    year = year.toString().padStart(4, "0"); // Ensure the year is 4 digits
  }

  // Update the input value with the corrected date
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
  const data = astroData[cardType]?.[cardKey];
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
        // Check if this card is already in the array
        const exists = cards.some(
          (c) => c.cardType === cardType && c.cardKey === cardKey
        );
        if (!exists) {
          cards.push({ cardType, cardKey });
        }
      }
    });

  console.log("Cards:", cards); // Correctly logs unique cards
  return cards;
}

// Add click listeners to the cards
document
  .querySelectorAll(".featured-carousel .card-wrapper")
  .forEach((card, index) => {
    let clickTimeout; // To store the timeout ID

    // Mouse down event to track the starting point
    card.addEventListener("mousedown", () => {
      isMouseDownOnCard = true;
      mouseDownCardIndex = index; // Track the index of the card where the mouse is pressed

      // Start a timeout to reset the click state after 1 second
      clickTimeout = setTimeout(() => {
        isMouseDownOnCard = false; // Invalidate the click if held too long
        mouseDownCardIndex = -1;
      }, 200); // 1-second delay
    });

    // Mouse up event to check if it's a valid click
    card.addEventListener("mouseup", () => {
      clearTimeout(clickTimeout); // Clear the timeout on mouse up
      if (isMouseDownOnCard && mouseDownCardIndex === index) {
        // Ensure the mouse was pressed and released on the same card within 1 second
        const mainCarouselCards = getMainCarouselCards();
        console.log("Clicked index:", index, "Card:", mainCarouselCards[index]); // Debug the index
        openDetailedCarousel(mainCarouselCards, index); // Open the detailed carousel
      }
      // Reset the tracking variables
      isMouseDownOnCard = false;
      mouseDownCardIndex = -1;
    });

    // Mouse leave event to reset the tracking variables if the mouse moves away
    card.addEventListener("mouseleave", () => {
      clearTimeout(clickTimeout); // Clear the timeout if the mouse leaves the card
      isMouseDownOnCard = false;
      mouseDownCardIndex = -1;
    });
  });

document
  .querySelectorAll(".owl-nav .owl-prev, .owl-nav .owl-next")
  .forEach((button) => {
    button.addEventListener("mouseup", () => {
      button.blur(); // Remove focus from the button
    });
  });
