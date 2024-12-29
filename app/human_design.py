from datetime import datetime
import swisseph as swe
from pytz import timezone, utc
from timezonefinder import TimezoneFinder

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

def calculate_human_design(dob, birth_time, latitude, longitude):
    """
    Calculate Human Design foundational properties using local algorithms.

    Args:
        dob (str): Date of birth in YYYY-MM-DD format.
        birth_time (str): Time of birth in HH:MM format (24-hour clock).
        latitude (float): Latitude of birth location.
        longitude (float): Longitude of birth location.

    Returns:
        dict: Foundational Human Design properties including Type, Strategy, Authority, etc.
    """
    try:
        # Parse and localize birth datetime
        naive_datetime = datetime.strptime(f"{dob} {birth_time}", "%Y-%m-%d %H:%M")
        tf = TimezoneFinder()
        timezone_name = tf.timezone_at(lat=latitude, lng=longitude)
        if not timezone_name:
            raise ValueError(f"Could not determine timezone for coordinates: {latitude}, {longitude}")
        
        local_tz = timezone(timezone_name)
        localized_datetime = local_tz.localize(naive_datetime)
        utc_datetime = localized_datetime.astimezone(utc)

        # Convert to Julian day
        julian_day = swe.julday(
            utc_datetime.year, utc_datetime.month, utc_datetime.day,
            utc_datetime.hour + utc_datetime.minute / 60
        )

        # Calculate planetary positions
        planetary_positions = calculate_planetary_positions(julian_day)

        # Determine foundational properties
        type_ = determine_human_design_type(planetary_positions)
        strategy = determine_strategy(type_)
        authority = determine_authority(type_, planetary_positions)
        profile = determine_profile(planetary_positions)
        definition = determine_definition(planetary_positions)
        not_self_theme = determine_not_self_theme(type_)
        signature = determine_signature(type_)
        incarnation_cross = determine_incarnation_cross(planetary_positions)

        # Compile results
        return {
            "Type": type_,
            "Strategy": strategy,
            "Not-Self Theme": not_self_theme,
            "Signature": signature,
            "Definition": definition,
            "Authority": authority,
            "Profile": profile,
            "Incarnation Cross": incarnation_cross,
        }
    except Exception as e:
        raise ValueError(f"Error calculating Human Design properties: {e}")

def calculate_planetary_positions(julian_day):
    """
    Calculate the positions of the major celestial bodies.

    Args:
        julian_day (float): Julian day number.

    Returns:
        dict: Planetary positions (degrees) keyed by planet.
    """
    planets = ["SUN", "MOON", "MERCURY", "VENUS", "MARS", "JUPITER", "SATURN", "URANUS", "NEPTUNE", "PLUTO"]
    positions = {}

    for planet in planets:
        position, _ = swe.calc_ut(julian_day, getattr(swe, planet))
        positions[planet] = position[0]  # Longitude in degrees

    # Add Earth position (opposite of Sun)
    positions["EARTH"] = (positions["SUN"] + 180) % 360

    return positions

def get_human_design_gate(degree):
    """
    Convert a zodiac degree to a Human Design gate.

    Args:
        degree (float): The degree in the zodiac (0-360).

    Returns:
        int: The corresponding Human Design gate (1-64).
    """
    gate_size = 360 / 64  # Each gate spans 5.625 degrees
    return int(degree / gate_size) + 1

def determine_human_design_type(planetary_positions):
    """
    Determine the Human Design Type based on planetary activations.

    Args:
        planetary_positions (dict): Planetary positions (degrees) keyed by planet.

    Returns:
        str: Human Design Type (Generator, Manifestor, Projector, Reflector).
    """
    # Gates linked to the Sacral Center
    sacral_gates = {3, 5, 9, 14, 27, 29, 34, 42, 50}
    defined_sacral = any(
        get_human_design_gate(planetary_positions[planet]) in sacral_gates
        for planet in planetary_positions
    )

    # Gates linked to Motor Centers (Root, Heart, Solar Plexus, Sacral)
    motor_center_gates = {19, 39, 41, 53, 54, 58, 30, 36, 22, 55, 26, 51, 21}
    defined_motor = any(
        get_human_design_gate(planetary_positions[planet]) in motor_center_gates
        for planet in planetary_positions
    )

    if defined_sacral:
        return "Generator"  # Sacral definition means Generator or Manifesting Generator
    elif defined_motor and not defined_sacral:
        return "Manifestor"
    elif not defined_motor:
        return "Projector"
    else:
        return "Reflector"

def determine_strategy(type_):
    """Determine Strategy based on Type."""
    strategies = {
        "Generator": "To Respond",
        "Manifestor": "Inform before acting",
        "Projector": "Wait for the invitation",
        "Reflector": "Wait for the lunar cycle",
    }
    return strategies.get(type_, "Unknown")

def determine_authority(type_, planetary_positions):
    """
    Determine Authority based on Human Design Type and planetary positions.

    Args:
        type_ (str): The Human Design type (e.g., "Generator", "Manifestor").
        planetary_positions (dict): Planetary positions (degrees) keyed by planet.

    Returns:
        str: The Authority (e.g., "Emotional", "Sacral", "Splenic", etc.).
    """
    def is_gate_active(center_gates):
        """Helper function to check if any gate in a center is active."""
        return any(get_human_design_gate(planetary_positions[planet]) in center_gates for planet in planetary_positions)

    # Define gates for centers associated with authorities
    emotional_gates = {22, 6, 37, 49, 30, 55, 36}  # Emotional Solar Plexus gates
    sacral_gates = {3, 5, 9, 14, 27, 29, 34, 42, 50}  # Sacral gates
    splenic_gates = {48, 57, 44, 50, 32, 28, 18}  # Spleen gates
    ego_gates = {21, 51, 26, 40}  # Ego (Heart) gates
    g_center_gates = {1, 2, 7, 10, 13, 15, 25, 46}  # G Center gates
    ajna_gates = {47, 24, 4, 17, 11, 43}  # Ajna gates
    head_gates = {64, 61, 63}  # Head gates

    # Determine authority based on center activations and type
    if is_gate_active(emotional_gates):
        return "Emotional Solar Plexus"
    elif type_ in ["Generator", "Manifesting Generator"] and is_gate_active(sacral_gates):
        return "Sacral"
    elif is_gate_active(splenic_gates):
        return "Splenic"
    elif type_ == "Manifestor" and is_gate_active(ego_gates):
        return "Ego Manifested"
    elif type_ == "Projector" and is_gate_active(ego_gates):
        return "Ego Projected"
    elif type_ == "Projector" and is_gate_active(g_center_gates):
        return "Self-Projected"
    elif type_ == "Projector" and (is_gate_active(ajna_gates) or is_gate_active(head_gates)):
        return "Mental (Environmental)"
    elif type_ == "Reflector":
        return "Lunar Cycle"
    
    # Fallback for undefined authorities
    return "None (Outer Authority)"

def determine_profile(planetary_positions):
    """
    Determine the Human Design Profile based on the Sun and Earth positions.

    Args:
        planetary_positions (dict): Planetary positions (degrees) keyed by planet.

    Returns:
        str: Human Design Profile (e.g., "1/3", "2/4").
    """
    def get_line(degree):
        """Calculate the line (1–6) within a gate based on the degree."""
        gate_size = 360 / 64  # Each gate spans 5.625 degrees
        line_size = gate_size / 6  # Each line spans 0.9375 degrees
        return int((degree % gate_size) / line_size) + 1

    # Get Sun and Earth lines
    sun_line = get_line(planetary_positions["SUN"])
    earth_line = get_line(planetary_positions["EARTH"])

    # Return the Profile as "<conscious_line>/<unconscious_line>"
    return f"{sun_line}/{earth_line}"

def determine_definition(planetary_positions):
    """
    Determine Definition type based on center connectivity.

    Args:
        planetary_positions (dict): Planetary positions (degrees) keyed by planet.

    Returns:
        str: Definition (Single, Split, Triple Split, Quadruple Split).
    """
    # Simulate connections (replace this logic with an actual center-mapping algorithm)
    connected_gates = {
        "Single": {1, 8, 13, 33},  # Example: Gates forming a single connection
        "Split": {10, 57, 34, 42},  # Example: Gates forming two groups (Split)
    }
    
    # Check activated gates in planetary positions
    activated_gates = {int(planetary_positions[planet] / 5.625) for planet in planetary_positions}
    
    if connected_gates["Single"].issubset(activated_gates):
        return "Single"
    elif connected_gates["Split"].intersection(activated_gates):
        return "Split"
    else:
        return "Undefined"

def determine_not_self_theme(type_):
    """Determine the Not-Self Theme."""
    themes = {
        "Generator": "Frustration",
        "Manifestor": "Anger",
        "Projector": "Bitterness",
        "Reflector": "Disappointment",
    }
    return themes.get(type_, "Unknown")

def determine_signature(type_):
    """Determine the Signature."""
    signatures = {
        "Generator": "Satisfaction",
        "Manifestor": "Peace",
        "Projector": "Success",
        "Reflector": "Surprise",
    }
    return signatures.get(type_, "Unknown")

def determine_incarnation_cross(planetary_positions):
    """
    Determine the Incarnation Cross based on Sun and Earth gates.

    Args:
        planetary_positions (dict): Planetary positions (degrees) keyed by planet.

    Returns:
        str: Incarnation Cross (e.g., "Right Angle Cross of Maya").
    """
    sun_gate = int(planetary_positions["SUN"] / 5.625)
    earth_gate = int(planetary_positions["EARTH"] / 5.625)

    # Example mapping of gates to Incarnation Cross names
    incarnation_crosses = {
        (61, 62): "Right Angle Cross of Maya",
        (32, 42): "Right Angle Cross of the Sphinx",
        (5, 6): "Right Angle Cross of Alignment",
        (29, 46): "Right Angle Cross of Rulership",
        (37, 40): "Right Angle Cross of Service",
        (35, 47): "Right Angle Cross of Consciousness",
        (41, 31): "Right Angle Cross of the Unexpected",
        (34, 20): "Right Angle Cross of the Sleeping Phoenix",
        (36, 6): "Left Angle Cross of Education",
        (13, 7): "Left Angle Cross of Cycles",
        (50, 3): "Left Angle Cross of Healing",
        (10, 15): "Left Angle Cross of Defiance",
        (26, 45): "Left Angle Cross of Influence",
        (12, 22): "Left Angle Cross of the Plane",
        (24, 44): "Left Angle Cross of Distraction",
        (64, 47): "Left Angle Cross of Dominion",
        (53, 54): "Juxtaposition Cross of Beginnings",
        (38, 39): "Juxtaposition Cross of Opposition",
        (19, 33): "Juxtaposition Cross of Sensitivity",
        (42, 3): "Juxtaposition Cross of Completion",
        (28, 32): "Juxtaposition Cross of Risk",
        (45, 26): "Juxtaposition Cross of Rulership",
    }
    
        # Attempt to match the Sun and Earth gates to a known cross
    cross_name = incarnation_crosses.get((sun_gate, earth_gate))
    
    if cross_name is None:
        return f"Custom Cross (Sun Gate: {sun_gate}, Earth Gate: {earth_gate})"

    return cross_name

# #Cristi :
# dob = "1988-01-12"
# birth_time = "15:30"
# latitude = 44.4268  # Bucharest
# longitude = 26.1025  # Bucharest

# #Alex
# dob = "1988-10-07"
# birth_time = "07:00"
# latitude = 46.66667000  # Beius
# longitude = 22.50000000  # Beius

# human_design = calculate_human_design(dob, birth_time, latitude, longitude)

# for key, value in human_design.items():
#     print(f"{key}: {value}")