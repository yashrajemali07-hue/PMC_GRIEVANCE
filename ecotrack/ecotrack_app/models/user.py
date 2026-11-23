from datetime import datetime


def create_user_document(name, email, password_hash, ward, otp_hash, otp_expiry):
    """Return a beginner-friendly user document matching the users collection."""
    return {
        "name": name,
        "email": email.lower(),
        "password": password_hash,
        "ward": ward,
        "verified": False,
        "eco_points": 0,
        "role": "citizen",
        "created_at": datetime.now(),
        "otp": otp_hash,
        "otp_expiry": otp_expiry,
    }


def get_user_level(points):
    """Convert eco points into the visible citizen level."""
    if points >= 100:
        return "Eco Champion"
    if points >= 40:
        return "Green Warrior"
    return "Beginner"
