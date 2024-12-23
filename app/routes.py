from flask import Blueprint, render_template, request, redirect, url_for

# Define a Blueprint for the routes
main = Blueprint("main", __name__)

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
    return render_template("home.html")  # Render the home page

# Additional routes for dashboard and cards
@main.route("/dashboard")
def dashboard():
    return render_template("home.html")

@main.route("/cards")
def cards():
    return render_template("cards.html")