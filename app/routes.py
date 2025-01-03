from flask import Flask, Blueprint, render_template, request, redirect, url_for, jsonify, session
from datetime import datetime
from app.astrology import *
from app.human_design import *
# from app.ai_description import generate_local_description

main = Blueprint("main", __name__)
app = Flask(__name__)
app.secret_key = "1qaz"

@main.route("/calculate", methods=["POST"])
def calculate():
    try:
        # Get form inputs
        city_coordinates = request.form.get("city_coordinates")
        dob = request.form.get("dob")
        hour = request.form.get("hour")
        latitude = request.form.get("latitude")
        longitude = request.form.get("longitude")

        print(f"Received data: city_coordinates={city_coordinates}, dob={dob}, hour={hour}, latitude={latitude}, longitude={longitude}")

        # Check for missing data
        if not all([city_coordinates, dob, hour, latitude, longitude]):
            print("Error: Missing required form data.")
            return "Error: Missing required form data.", 400

        # Perform calculation
        latitude = float(latitude)
        longitude = float(longitude)
        astrology_details = calculate_astrology_details(dob, hour, latitude, longitude)
        human_design_details = calculate_human_design(dob,hour, latitude, longitude)
        print(human_design_details)

        # Store results in session
        session["results"] = {
            "city": city_coordinates,
            "dob": dob,
            "hour": hour,
            "latitude": latitude,
            "longitude": longitude,
            #Astrology fields
            "element": astrology_details["element"],
            "sun_sign": astrology_details["sun_sign"],
            "sun_position_dms": astrology_details["sun_position_dms"],
            "rising_sign": astrology_details["rising_sign"],
            "ascendant_position_dms": astrology_details["ascendant_position_dms"],
            "ruling_planet": astrology_details["ruling_planet"],
            "sun_house_title": astrology_details["sun_house"]["title"],
    		"sun_house_description": astrology_details["sun_house"]["description"],
    		"sun_house_degree": astrology_details["sun_house"]["degree"],
    		"ascendant_house_title": astrology_details["ascendant_house"]["title"],
    		"ascendant_house_description": astrology_details["ascendant_house"]["description"],
    		"ascendant_house_degree": astrology_details["ascendant_house"]["degree"],
            # Human Design fields
            "type": human_design_details["Type"],
            "strategy": human_design_details["Strategy"],
            "not_self_theme": human_design_details["Not-Self Theme"],
            "signature": human_design_details["Signature"],
            "definition": human_design_details["Definition"],
            "authority": human_design_details["Authority"],
            "profile": human_design_details["Profile"],
            "incarnation_cross": human_design_details["Incarnation Cross"],
        }

        # Redirect to results
        print("Redirecting to /results")
        return redirect(url_for("main.results"))
    
    except ValueError as e:
        return render_template("error.html", message=f"An error occurred: {e}")
    except Exception as e:
        return f"Unexpected error: {e}", 500
    
@main.route("/results", methods=["GET"])
def results():
    if "results" not in session:
        print("No results in session. Redirecting to home.")
        return redirect(url_for("main.home"))

    results = session["results"]  # Retrieve results from session without popping
    
    # description = generate_local_description(sun_sign, rising_sign)
    # print(description)
    
    return render_template(
		"results.html",
		city=results.get("city", "Unknown"),
		dob=results.get("dob", "Unknown"),
		hour=results.get("hour", "Unknown"),
		sun_sign=results.get("sun_sign", "Unknown"),
        sun_position_dms=results.get("sun_position_dms"),
		rising_sign=results.get("rising_sign", "Unknown"),
        ascendant_position_dms=results.get("ascendant_position_dms"),
		ruling_planet=results.get("ruling_planet", "Unknown"),
		element=results.get("element", "Unknown"),
        sun_house_title=results.get("sun_house_title", "Unknown"),
		sun_house_description=results.get("sun_house_description", "No description available."),
		sun_house_degree=results.get("sun_house_degree", 0.0),
		ascendant_house_title=results.get("ascendant_house_title", "Unknown"),
		ascendant_house_description=results.get("ascendant_house_description", "No description available."),
		ascendant_house_degree=results.get("ascendant_house_degree", 0.0),
		type=results.get("type", "Unknown"),
		strategy=results.get("strategy", "Unknown"),
		not_self_theme=results.get("not_self_theme", "Unknown"),
		signature=results.get("signature", "Unknown"),
		definition=results.get("definition", "Unknown"),
		authority=results.get("authority", "Unknown"),
		profile=results.get("profile", "Unknown"),
		incarnation_cross=results.get("incarnation_cross", "Unknown"),
)
    
@main.route("/")
def index():
    return redirect(url_for("main.login"))

@main.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        # Simple login validation logic
        if email == "user" and password == "user":
            session["logged_in"] = True  # Mark the user as logged in
            return redirect(url_for("main.home"))
        else:
            # Render the login page with an error message if login fails
            return render_template("login.html", error="Invalid login credentials")
    return render_template("login.html")  # Render the login page for GET requests

@main.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("main.login"))

@main.before_app_request
def require_login():
    # List routes that do not require authentication
    allowed_routes = ["main.login", "main.index"]
    if "logged_in" not in session and request.endpoint not in allowed_routes:
        return redirect(url_for("main.login"))
    
@main.route("/home")
def home():
    return render_template("landing.html")