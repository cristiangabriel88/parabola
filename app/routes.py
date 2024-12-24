from flask import Blueprint, render_template, request, redirect, url_for, jsonify
from datetime import datetime
import swisseph as swe
import json

# Define a Blueprint for the routes
main = Blueprint("main", __name__)

CITY_COORDINATES = {
    "Bucharest (Romania)": (44.4268, 26.1025),
    "New York (USA)": (40.7128, -74.0060),
    "London (United Kingdom)": (51.5074, -0.1278),
    "Tokyo (Japan)": (35.6895, 139.6917),
}


def calculate_astrology_details(dob, birth_time, latitude, longitude):
    """
    Calculate astrological details based on date, time, and place of birth.

    Args:
        dob (str): Date of birth in YYYY-MM-DD format.
        birth_time (str): Time of birth in HH:MM (24-hour) format.
        latitude (float): Latitude of birth location.
        longitude (float): Longitude of birth location.

    Returns:
        dict: Dictionary containing Sun sign, Rising sign, ruling planet, and house cusps.
    """
    try:
        # Combine date and time of birth into a single datetime object
        birth_datetime = datetime.strptime(f"{dob} {birth_time}", "%Y-%m-%d %H:%M")

        # Convert to Julian day (used by Swiss Ephemeris)
        julian_day = swe.julday(
            birth_datetime.year, birth_datetime.month, birth_datetime.day,
            birth_datetime.hour + birth_datetime.minute / 60
        )

        # Set geographic location
        swe.set_topo(longitude, latitude, 0)  # Longitude, Latitude, Altitude (0 for sea level)

        # Calculate the Sun's position (for the Sun sign)
        sun_position, _ = swe.calc_ut(julian_day, swe.SUN)  # Unpack the tuple
        sun_sign = get_astrological_sign(sun_position[0])  # Use only the longitude

        # Calculate the Ascendant (Rising sign) and house positions
        house_cusps, ascendant_tuple = swe.houses(
            julian_day, latitude, longitude, b'A'  # A = Placidus house system
        )
        ascendant = ascendant_tuple[0]  # Extract longitude for the Ascendant
        rising_sign = get_astrological_sign(ascendant)

        # Calculate ruling planet for the Rising sign
        ruling_planets = {
            "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
            "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Mars/Pluto",
            "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Saturn/Uranus",
            "Pisces": "Jupiter/Neptune"
        }
        ruling_planet = ruling_planets.get(rising_sign, "Unknown")

        # Return astrology details
        return {
            "sun_sign": sun_sign,
            "rising_sign": rising_sign,
            "ruling_planet": ruling_planet,
            "houses": {f"House {i+1}": cusp for i, cusp in enumerate(house_cusps)},
        }
    except Exception as e:
        raise ValueError(f"Error calculating astrology details: {e}")
    
def get_astrological_sign(longitude):
    """
    Get the astrological sign based on longitude.

    Args:
        longitude (float): Longitude of the celestial body.

    Returns:
        str: Zodiac sign corresponding to the longitude.
    """
    signs = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    index = int(longitude // 30)  # Each zodiac sign spans 30 degrees
    return signs[index]

@main.route("/calculate", methods=["POST"])
def calculate():
    city_coordinates = request.form.get("city_coordinates")
    if not city_coordinates:
        return "Error: Missing city coordinates.", 400

    try:
        city_coordinates = json.loads(city_coordinates)
        country = city_coordinates.get("country")
        city = city_coordinates.get("city")
        coordinates = city_coordinates.get("coordinates")

        if not coordinates:
            return "Error: Missing coordinates.", 400

        latitude, longitude = map(float, coordinates.strip("()").split(", "))

        # Extract additional form data
        name = request.form["name"]
        dob = request.form["dob"]
        hour = request.form["hour"]

        # Calculate astrology details
        astrology_details = calculate_astrology_details(dob, hour, latitude, longitude)

        return render_template(
            "results.html",
            name=name,
            country=country,
            city=city,
            dob=datetime.strptime(dob, "%Y-%m-%d").strftime("%B %d, %Y"),
            hour=datetime.strptime(hour, "%H:%M").strftime("%I:%M %p"),
            sun_sign=astrology_details["sun_sign"],
            rising_sign=astrology_details["rising_sign"],
            ruling_planet=astrology_details["ruling_planet"],
            houses=astrology_details["houses"],
        )
    except ValueError as e:
        return render_template("error.html", message=f"An error occurred: {e}")
    
# Redirect the root "/" to the login page
@main.route("/")
def index():
    return redirect(url_for("main.login"))

# Render the login page and handle login submissions
@main.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        # Simple login validation logic
        if email == "user@example.com" and password == "user":
            return redirect(url_for("main.home"))
        else:
            # Render the login page with an error message if login fails
            return render_template("login.html", error="Invalid login credentials.")
    return render_template("login.html")  # Render the login page for GET requests

# Home route (after successful login)
@main.route("/home")
def home():
    return render_template("landing.html")

@main.route("/dashboard")
def dashboard():
    return render_template("home.html")

@main.route("/cards")
def cards():
    return render_template("cards.html")