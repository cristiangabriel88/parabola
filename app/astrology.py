import swisseph as swe
from pytz import timezone, utc
from timezonefinder import TimezoneFinder
from datetime import datetime
import json
import os

def convert_to_dms(decimal_degrees):
    """
    Convert a decimal degree value to degrees, minutes, and seconds.

    Args:
        decimal_degrees (float): The position in decimal degrees.

    Returns:
        str: The position formatted as "X°Y'Z"".
    """
    print(f"Converting to DMS: {decimal_degrees}")
    degrees = int(decimal_degrees)  # Get the whole number part (degrees)
    remainder = abs(decimal_degrees - degrees) * 60  # Calculate the remainder in minutes
    minutes = int(remainder)  # Get the whole number part (minutes)
    seconds = int((remainder - minutes) * 60)  # Calculate the remaining fraction as seconds

    return f"{degrees}°{minutes}'{seconds}\""

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

# ? ASTROLOGY SIGN
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

# ? ASTROLOGY ASCENDANT
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

def get_element(sign):
    """
    Determine the astrological element (Fire, Earth, Air, Water) based on the zodiac sign.

    Args:
        sign (str): The zodiac sign (e.g., "Aries", "Taurus").

    Returns:
        str: The element corresponding to the zodiac sign.
    """
    elements = {
        "Fire": ["Aries", "Leo", "Sagittarius"],
        "Earth": ["Taurus", "Virgo", "Capricorn"],
        "Air": ["Gemini", "Libra", "Aquarius"],
        "Water": ["Cancer", "Scorpio", "Pisces"]
    }
    
    for element, signs in elements.items():
        if sign in signs:
            print(element)
            return element
        
    print(element)
    
    return "Unknown"

def determine_house(longitude, house_cusps):
    """
    Determine which house a celestial body is in based on its longitude
    and calculate the degree within the house.
    """
    for i in range(len(house_cusps) - 1):
        if house_cusps[i] <= longitude < house_cusps[i + 1]:
            house_number = i + 1
            degree_in_house = longitude - house_cusps[i]
            return house_number, degree_in_house
    if longitude >= house_cusps[-1]:
        house_number = 12
        degree_in_house = longitude - house_cusps[-1]
    else:
        house_number = 1
        degree_in_house = longitude + (360 - house_cusps[-1])
    return house_number, degree_in_house


def get_house_info(house_number):
    """
    Get house title and description from the houses.json file.
    """
    try:
        # Construct the path to the houses.json file
        base_dir = os.path.dirname(os.path.abspath(__file__))  # Directory of the current script
        file_path = os.path.join(base_dir, "static", "data", "houses.json")
        
        # Load the JSON file
        with open(file_path, "r") as file:
            houses_json = json.load(file)
        
        # Retrieve the house data
        house_data = houses_json.get(str(house_number), {})
        return house_data.get("title", "Unknown House"), house_data.get("description", "No description available.")
    
    except FileNotFoundError:
        raise FileNotFoundError(f"The file houses.json was not found at {file_path}.")
    except json.JSONDecodeError:
        raise ValueError("Error decoding the houses.json file.")


# ? ASTROLOGY DETAILS
def calculate_astrology_details(dob, birth_time, latitude, longitude):
    try:
        
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
        print(f"Sun Position (decimal degrees): {sun_position[0]}")
        sun_sign = get_astrological_sign(sun_position[0])
        sun_position_dms = convert_to_dms(sun_position[0])  # Format Sun's degree as DMS

        # Calculate Ascendant
        ascendant_sign, ascendant_degree = calculate_ascendant(dob, birth_time, latitude, longitude)
        ascendant_position_dms = convert_to_dms(ascendant_degree)  # Format Ascendant's degree as DMS
        
		# Calculate Element
        element = get_element(sun_sign)

        # Calculate Houses
        house_cusps, _ = swe.houses(julian_day, latitude, longitude, b'P')  # Placidus house system
        
		# Determine the Sun and Ascendant houses with degrees
        sun_house, sun_house_degree = determine_house(sun_position[0], house_cusps)
        ascendant_house, ascendant_house_degree = determine_house(ascendant_degree, house_cusps)

        # Get details for the significant houses
        sun_house_title, sun_house_description = get_house_info(sun_house)
        ascendant_house_title, ascendant_house_description = get_house_info(ascendant_house)

        # Calculate ruling planet
        ruling_planets = {
            "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
            "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Mars/Pluto",
            "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Saturn/Uranus",
            "Pisces": "Jupiter/Neptune"
        }
        ruling_planet = ruling_planets.get(sun_sign, "Unknown")

        return {
            "sun_sign": sun_sign,
            "sun_position_dms": sun_position_dms,
            "rising_sign": ascendant_sign,
            "ascendant_position_dms": ascendant_position_dms,
            "ascendant_degree": ascendant_degree,
            "ruling_planet": ruling_planet,
            "element": element,
            "houses": {f"House {i+1}": cusp for i, cusp in enumerate(house_cusps)},
            "sun_house": {
                "title": sun_house_title,
                "description": sun_house_description,
                "degree": round(sun_house_degree, 2),
            },
            "ascendant_house": {
                "title": ascendant_house_title,
                "description": ascendant_house_description,
                "degree": round(ascendant_house_degree, 2),
            }
        }
    except Exception as e:
        raise ValueError(f"Error calculating astrology details: {e}")
    