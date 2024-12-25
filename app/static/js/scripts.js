document.addEventListener("DOMContentLoaded", () => {
  console.log("Parabola app loaded.");
});

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("locationForm");
  const countrySelect = document.getElementById("country");
  const citySelect = document.getElementById("city");
  const cityCache = {};

  if (!form || !countrySelect || !citySelect) {
    console.log("This page does not require location form functionality.");
    return; // Exit if these elements are not present
  }

  function populateCityDropdown(cityOptions) {
    citySelect.innerHTML = '<option value="">Select a city</option>';
    cityOptions.forEach((city) => {
      const option = document.createElement("option");
      option.value = JSON.stringify({
        name: city.name,
        latitude: city.latitude,
        longitude: city.longitude,
      });
      option.textContent = city.name;
      citySelect.appendChild(option);
    });
  }

  fetch("/static/data/countries+cities.json")
    .then((response) => response.json())
    .then((data) => {
      data.forEach((country) => {
        const option = document.createElement("option");
        option.value = country.name;
        option.textContent = country.name;
        countrySelect.appendChild(option);
      });

      countrySelect.addEventListener("change", function () {
        const selectedCountry = countrySelect.value;
        const countryData = data.find((c) => c.name === selectedCountry);

        citySelect.innerHTML = '<option value="">Select a city</option>';
        if (cityCache[selectedCountry]) {
          // Use preloaded data from cache
          populateCityDropdown(cityCache[selectedCountry]);
        } else {
          // Fetch cities and populate dropdown
          const countryData = data.find(
            (country) => country.name === selectedCountry
          );
          if (countryData && countryData.cities) {
            const cityOptions = countryData.cities.map((city) => ({
              name: city.name,
              latitude: city.latitude,
              longitude: city.longitude,
            }));
            cityCache[selectedCountry] = cityOptions; // Cache the city data for future use
            populateCityDropdown(cityOptions);
          } else {
            citySelect.innerHTML =
              '<option value="">No cities available</option>';
          }
        }
      });
    })
    .catch((error) =>
      console.error("Error loading countries and cities:", error)
    );

  form.addEventListener("submit", function (event) {
    const selectedCountry = countrySelect.value;
    const selectedCity = JSON.parse(citySelect.value);

    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "city_coordinates";
    hiddenInput.value = JSON.stringify({
      country: selectedCountry,
      city: selectedCity.name,
      coordinates: `(${selectedCity.latitude}, ${selectedCity.longitude})`,
    });

    form.appendChild(hiddenInput);
  });
});
