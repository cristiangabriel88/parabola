from app import create_app, db
from app.models import User

app = create_app()

with app.app_context():
    # Create a standard user
    standard_user = User(username="user", email="user@example.com", password="user")

    # Add and commit the user to the database
    db.session.add(standard_user)
    db.session.commit()

    print("Standard user created!")