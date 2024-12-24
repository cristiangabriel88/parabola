document.addEventListener("DOMContentLoaded", () => {
  console.log("Parabola app loaded.");
});

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("locationForm");
  const countrySelect = document.getElementById("country");
  const citySelect = document.getElementById("city");

  if (!form || !countrySelect || !citySelect) {
    console.error("Form, country select, or city select element is missing.");
    return;
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
        if (countryData && countryData.cities) {
          countryData.cities.forEach((city) => {
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
