from flask import Flask, Blueprint, render_template, request, redirect, url_for, jsonify
from datetime import datetime
import swisseph as swe
import json
from pytz import timezone, utc
from timezonefinder import TimezoneFinder

main = Blueprint("main", __name__)
app = Flask(__name__)

def validate_date(date_string):
    try:
        datetime.strptime(date_string, "%d/%m/%Y")
        return True
    except ValueError:
        return False

def validate_time(time_string):
    try:
        datetime.strptime(time_string, "%H:%M")
        return True
    except ValueError:
        return False
    
def get_timezone_from_coordinates(latitude, longitude):
    """
    Get the IANA time zone name based on latitude and longitude.

    Args:
        latitude (float): Latitude of the location.
        longitude (float): Longitude of the location.

    Returns:
        str: IANA time zone name (e.g., "Europe/Bucharest").
    """
    tf = TimezoneFinder()
    timezone_name = tf.timezone_at(lat=latitude, lng=longitude)
    if timezone_name is None:
        raise ValueError(f"Could not determine time zone for coordinates: {latitude}, {longitude}")
    return timezone_name

def calculate_ascendant(dob, birth_time, latitude, longitude):
    """
    Calculate the Ascendant (Rising Sign), considering DST and local time zone.

    Args:
        dob (str): Date of birth in YYYY-MM-DD format.
        birth_time (str): Time of birth in HH:MM format (24-hour).
        latitude (float): Latitude of birth location.
        longitude (float): Longitude of birth location.
        tz_name (str): Time zone name (e.g., "Europe/Bucharest").

    Returns:
        tuple: Ascendant sign and degree.
    """
    timezone_name = get_timezone_from_coordinates(latitude, longitude)
    print(f"Time Zone: {timezone_name}")
    
    # Combine date and time into a naive datetime object
    naive_datetime = datetime.strptime(f"{dob} {birth_time}", "%Y-%m-%d %H:%M")
    
	# Localize to the given time zone and account for DST
    local_tz = timezone(timezone_name)
    localized_datetime = local_tz.localize(naive_datetime)

    # Convert to UTC
    utc_datetime = localized_datetime.astimezone(utc)

    # Convert UTC time to Julian day
    julian_day = swe.julday(
        utc_datetime.year,
        utc_datetime.month,
        utc_datetime.day,
        utc_datetime.hour + utc_datetime.minute / 60
    )

    # Calculate Local Sidereal Time (LST) directly
    gst = swe.sidtime(julian_day)  # GST in decimal hours
    print(f"GST (hours): {gst}")
    
    longitude_in_hours = longitude / 15  # Convert longitude to hours
    local_sidereal_time = (gst + longitude_in_hours) % 24  # Normalize LST to 24-hour format
    
    # Convert LST to degrees (360° corresponds to 24 hours)
    lst_in_degrees = local_sidereal_time * 15
    print(f"LST (in hours): {local_sidereal_time}")
    print(f"LST (in degrees): {lst_in_degrees}")

    # Use Swiss Ephemeris to calculate the Ascendant based on LST
    house_cusps, ascendant_info = swe.houses(julian_day, latitude, longitude, b'P')
    ascendant_degree = ascendant_info[0]
    print(f"Ascendant Degree (Raw): {ascendant_degree}")
    
	# Validate if Ascendant Degree needs adjustments
    if ascendant_degree < 0:
        ascendant_degree += 360  # Ensure it's in the 0°–360° range
        
    print(f"Adjusted Ascendant Degree: {ascendant_degree}")
        
    ascendant_sign = get_astrological_sign(ascendant_degree)
    
    print(f"Latitude: {latitude}")
    print(f"Longitude: {longitude}")
    print(f"Ascendant Degree: {ascendant_degree}")
    print(f"Ascendant Sign: {ascendant_sign}")

    return ascendant_sign, ascendant_degree

def calculate_astrology_details(dob, birth_time, latitude, longitude):
    try:
        # Convert from DD/MM/YYYY to YYYY-MM-DD
        # dob_converted = datetime.strptime(dob, "%d/%m/%Y").strftime("%Y-%m-%d")
        
        # Combine date and time of birth into a single datetime object
        birth_datetime = datetime.strptime(f"{dob} {birth_time}", "%Y-%m-%d %H:%M")

        # Convert to Julian day
        julian_day = swe.julday(
            birth_datetime.year, birth_datetime.month, birth_datetime.day,
            birth_datetime.hour + birth_datetime.minute / 60
        )

        # Set geographic location
        swe.set_topo(longitude, latitude, 0)  # Longitude, Latitude, Altitude (0 for sea level)

        # Calculate Sun Sign
        sun_position, _ = swe.calc_ut(julian_day, swe.SUN)
        sun_sign = get_astrological_sign(sun_position[0])

        # Calculate Ascendant
        ascendant_sign, ascendant_degree = calculate_ascendant(dob, birth_time, latitude, longitude)

        # Calculate Houses
        house_cusps, _ = swe.houses(julian_day, latitude, longitude, b'P')  # Placidus house system

        # Calculate ruling planet
        ruling_planets = {
            "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
            "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Mars/Pluto",
            "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Saturn/Uranus",
            "Pisces": "Jupiter/Neptune"
        }
        ruling_planet = ruling_planets.get(ascendant_sign, "Unknown")

        return {
            "sun_sign": sun_sign,
            "rising_sign": ascendant_sign,
            "ascendant_degree": ascendant_degree,
            "ruling_planet": ruling_planet,
            "houses": {f"House {i+1}": cusp for i, cusp in enumerate(house_cusps)}
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
    
    if isinstance(longitude, tuple):
        longitude = longitude[0] 
        
    signs = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    index = int(longitude // 30)  # Each zodiac sign spans 30 degrees
    return signs[index]

@main.route("/calculate", methods=["POST"])
def calculate():
    try:
        city_coordinates = request.form.get("city_coordinates")
        dob = request.form.get("dob")
        hour = request.form.get("hour")
        latitude = request.form.get("latitude")
        longitude = request.form.get("longitude")

        print(f"Received data: city_coordinates={city_coordinates}, dob={dob}, hour={hour}, latitude={latitude}, longitude={longitude}")

        if not all([city_coordinates, dob, hour, latitude, longitude]):
            return "Error: Missing required form data.", 400

        # if not validate_date(dob):
        #     return "Error: Invalid date format. Use DD/MM/YYYY.", 400

        # if not validate_time(hour):
        #     return "Error: Invalid time format. Use HH:MM.", 400

        latitude = float(latitude)
        longitude = float(longitude)

        astrology_details = calculate_astrology_details(dob, hour, latitude, longitude)

        return render_template(
            "results.html",
            city=city_coordinates,
            dob=datetime.strptime(dob, "%Y-%m-%d").strftime("%B %d, %Y"),
            hour=datetime.strptime(hour, "%H:%M").strftime("%I:%M %p"),
            sun_sign=astrology_details["sun_sign"],
            rising_sign=astrology_details["rising_sign"],
            ruling_planet=astrology_details["ruling_planet"],
            houses=astrology_details["houses"],
        )
    except ValueError as e:
        return render_template("error.html", message=f"An error occurred: {e}")
    except Exception as e:
        return f"Unexpected error: {e}", 500
    
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