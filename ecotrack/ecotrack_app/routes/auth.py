import hashlib
import random
from datetime import datetime, timedelta
from functools import wraps

from bson import ObjectId
from flask import Blueprint, flash, redirect, render_template, request, session, url_for
from pymongo.errors import DuplicateKeyError
from werkzeug.security import check_password_hash, generate_password_hash

from ..db import get_collection
from ..mail_utils import send_otp_email
from ..models.user import create_user_document, get_user_level
from ..utils import serialize_document, serialize_documents


auth_bp = Blueprint("auth", __name__)


def hash_otp(otp):
    """Store a hash instead of the plain OTP."""
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


def generate_otp():
    return str(random.randint(100000, 999999))


def login_required(view_func):
    """Protect citizen pages that require verified login."""
    @wraps(view_func)
    def wrapped_view(*args, **kwargs):
        if not session.get("user"):
            flash("Please login as a verified citizen first.", "warning")
            return redirect(url_for("auth.login", next=request.path))
        return view_func(*args, **kwargs)

    return wrapped_view


def current_user_document():
    user = session.get("user")
    if not user:
        return None
    return serialize_document(get_collection("users").find_one({"_id": ObjectId(user["id"])}))


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        ward = request.form.get("ward", "").strip()

        if not all([name, email, password, ward]):
            flash("Please fill in all registration fields.", "danger")
            return redirect(url_for("auth.register"))
        if len(password) < 6:
            flash("Password must be at least 6 characters.", "danger")
            return redirect(url_for("auth.register"))

        otp = generate_otp()
        otp_expiry = datetime.now() + timedelta(minutes=5)
        users_col = get_collection("users")

        try:
            users_col.insert_one(
                create_user_document(
                    name=name,
                    email=email,
                    password_hash=generate_password_hash(password),
                    ward=ward,
                    otp_hash=hash_otp(otp),
                    otp_expiry=otp_expiry,
                )
            )
        except DuplicateKeyError:
            flash("This email is already registered. Please login or verify your account.", "warning")
            return redirect(url_for("auth.login"))

        sent = send_otp_email(email, otp)
        session["pending_email"] = email
        if sent:
            flash("Registration successful. Please check your email for the OTP.", "success")
        else:
            flash("Registration successful. SMTP is not configured, so check the Flask console for your OTP.", "info")
        return redirect(url_for("auth.verify_otp"))

    return render_template("register.html")


@auth_bp.route("/verify-otp", methods=["GET", "POST"])
def verify_otp():
    email = session.get("pending_email") or request.args.get("email", "").strip().lower()
    if not email:
        flash("Please register or login first.", "warning")
        return redirect(url_for("auth.register"))

    users_col = get_collection("users")
    user = users_col.find_one({"email": email})
    if not user:
        flash("No pending account found for this email.", "danger")
        return redirect(url_for("auth.register"))

    if request.method == "POST":
        otp = request.form.get("otp", "").strip()
        if user.get("otp_expiry") and datetime.now() > user["otp_expiry"]:
            flash("OTP expired. Please request a new OTP.", "danger")
            return redirect(url_for("auth.verify_otp"))

        if hash_otp(otp) != user.get("otp"):
            flash("Invalid OTP. Please try again.", "danger")
            return redirect(url_for("auth.verify_otp"))

        users_col.update_one(
            {"_id": user["_id"]},
            {"$set": {"verified": True}, "$unset": {"otp": "", "otp_expiry": ""}},
        )
        session.pop("pending_email", None)
        flash("Email verified successfully. You can now login.", "success")
        return redirect(url_for("auth.login"))

    return render_template("verify_otp.html", email=email)


@auth_bp.route("/resend-otp", methods=["POST"])
def resend_otp():
    email = session.get("pending_email") or request.form.get("email", "").strip().lower()
    users_col = get_collection("users")
    user = users_col.find_one({"email": email, "verified": False})
    if not user:
        flash("No unverified account found for OTP resend.", "warning")
        return redirect(url_for("auth.login"))

    otp = generate_otp()
    users_col.update_one(
        {"_id": user["_id"]},
        {"$set": {"otp": hash_otp(otp), "otp_expiry": datetime.now() + timedelta(minutes=5)}},
    )
    send_otp_email(email, otp)
    session["pending_email"] = email
    flash("A fresh OTP has been sent.", "success")
    return redirect(url_for("auth.verify_otp"))


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        user = get_collection("users").find_one({"email": email})

        if not user or not check_password_hash(user.get("password", ""), password):
            flash("Invalid email or password.", "danger")
            return redirect(url_for("auth.login"))
        if not user.get("verified"):
            session["pending_email"] = email
            flash("Please verify your email before login.", "warning")
            return redirect(url_for("auth.verify_otp"))

        session["user"] = {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "ward": user.get("ward", ""),
        }
        flash(f"Welcome back, {user['name']}!", "success")
        return redirect(request.args.get("next") or url_for("public.index"))

    return render_template("login.html")


@auth_bp.route("/logout")
def logout():
    session.pop("user", None)
    flash("You have been logged out.", "info")
    return redirect(url_for("public.index"))


@auth_bp.route("/profile")
@login_required
def profile():
    user = current_user_document()
    complaints = serialize_documents(
        list(get_collection("complaints").find({"user_id": user["_id"]}).sort("created_at", -1))
    )
    actions = serialize_documents(
        list(get_collection("eco_actions").find({"user_id": user["_id"]}).sort("created_at", -1))
    )
    level = get_user_level(user.get("eco_points", 0))
    return render_template("profile.html", user=user, complaints=complaints, actions=actions, level=level)


@auth_bp.route("/leaderboard")
def leaderboard():
    leaders = serialize_documents(
        list(get_collection("users").find({"verified": True}).sort("eco_points", -1).limit(20))
    )
    for leader in leaders:
        leader["level"] = get_user_level(leader.get("eco_points", 0))
    return render_template("leaderboard.html", leaders=leaders)
