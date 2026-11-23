from datetime import datetime

from flask import Blueprint, current_app, flash, jsonify, redirect, render_template, request, session, url_for
from pymongo.errors import PyMongoError

from ..db import get_collection, ping_database
from ..models.complaint import calculate_priority
from ..routes.auth import login_required
from ..services import add_eco_points, generate_complaint_id, get_eco_score
from ..utils import save_image, serialize_document, serialize_documents, timeline_entry


public_bp = Blueprint("public", __name__)


@public_bp.route("/")
def index():
    try:
        complaints_col = get_collection("complaints")
        eco_actions_col = get_collection("eco_actions")

        total_complaints = complaints_col.count_documents({})
        resolved = complaints_col.count_documents({"status": "Resolved"})
        eco_actions = eco_actions_col.count_documents({})
        recent = serialize_documents(list(complaints_col.find().sort("created_at", -1).limit(5)))
        db_ok, db_error = ping_database()
    except PyMongoError as exc:
        current_app.logger.warning("MongoDB is unavailable on the homepage: %s", exc)
        total_complaints = 0
        resolved = 0
        eco_actions = 0
        recent = []
        db_ok = False
        db_error = str(exc)

    return render_template(
        "index.html",
        total_complaints=total_complaints,
        resolved=resolved,
        eco_actions=eco_actions,
        recent=recent,
        db_ok=db_ok,
        db_error=db_error,
    )


@public_bp.route("/complaint", methods=["GET", "POST"])
@login_required
def complaint():
    complaints_col = get_collection("complaints")
    user = session["user"]

    if request.method == "POST":
        name = user["name"]
        phone = request.form.get("phone", "").strip()
        address = request.form.get("address", "").strip()
        ward = request.form.get("ward", user.get("ward", "")).strip()
        issue_type = request.form.get("issue_type", "").strip()
        description = request.form.get("description", "").strip()
        latitude = request.form.get("latitude", "").strip()
        longitude = request.form.get("longitude", "").strip()

        if not all([phone, address, ward, issue_type, description]):
            flash("Please fill in all required fields.", "danger")
            return redirect(url_for("public.complaint"))

        image_url = save_image(request.files.get("image"))
        complaint_id = generate_complaint_id()
        now = datetime.now()
        priority = calculate_priority(issue_type)
        lat_value = float(latitude) if latitude else None
        lng_value = float(longitude) if longitude else None

        duplicate_query = {
            "status": {"$ne": "Resolved"},
            "issue_type": issue_type,
            "$or": [{"ward": ward}, {"address": {"$regex": ward, "$options": "i"}}],
        }
        possible_duplicate = complaints_col.find_one(duplicate_query)
        if possible_duplicate:
            flash(
                f"Warning: a similar unresolved complaint already exists nearby: "
                f"<strong>{possible_duplicate['complaint_id']}</strong>. Your report was still recorded.",
                "warning",
            )

        complaints_col.insert_one(
            {
                "complaint_id": complaint_id,
                "user_id": user["id"],
                "user_email": user["email"],
                "name": name,
                "phone": phone,
                "address": address,
                "ward": ward,
                "issue_type": issue_type,
                "priority": priority,
                "description": description,
                "image_url": image_url,
                "latitude": lat_value,
                "longitude": lng_value,
                "status": "Pending",
                "assigned_worker": None,
                "resolution_image": None,
                "created_at": now,
                "updated_at": now,
                "timeline": [timeline_entry("Pending", "Complaint submitted")],
            }
        )

        add_eco_points(user["id"], 5)
        flash(f"Complaint submitted successfully! Your Complaint ID: <strong>{complaint_id}</strong>", "success")
        return redirect(url_for("public.track", complaint_id=complaint_id))

    return render_template("complaint.html", user=user)


@public_bp.route("/track", methods=["GET", "POST"])
def track():
    complaints_col = get_collection("complaints")
    complaint_data = None

    if request.method == "POST" or request.args.get("complaint_id"):
        complaint_id = (request.form.get("complaint_id") or request.args.get("complaint_id") or "").strip().upper()
        if complaint_id:
            complaint_data = serialize_document(complaints_col.find_one({"complaint_id": complaint_id}))
            if complaint_data is None:
                flash("No complaint found with that ID. Please check and try again.", "warning")

    return render_template("track.html", complaint=complaint_data)


@public_bp.route("/eco_actions", methods=["GET", "POST"])
@login_required
def eco_actions():
    eco_actions_col = get_collection("eco_actions")
    user = session["user"]

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        location = request.form.get("location", "").strip()
        date = request.form.get("date", "").strip()
        category = request.form.get("category", "").strip()

        if not all([title, description, location, date, category]):
            flash("Please fill in all required fields.", "danger")
            return redirect(url_for("public.eco_actions"))

        eco_actions_col.insert_one(
            {
                "user_id": user["id"],
                "user_email": user["email"],
                "title": title,
                "description": description,
                "image_url": save_image(request.files.get("image")),
                "location": location,
                "date": date,
                "user": user["name"],
                "category": category,
                "created_at": datetime.now(),
                "likes": 0,
            }
        )
        add_eco_points(user["id"], 10)
        flash("Eco action posted successfully! You earned +10 points!", "success")
        return redirect(url_for("public.eco_actions"))

    all_actions = serialize_documents(list(eco_actions_col.find().sort("created_at", -1)))
    return render_template("eco_actions.html", actions=all_actions)


@public_bp.route("/awareness")
def awareness():
    return render_template("awareness.html")


@public_bp.route("/map_data")
def map_data():
    complaints_col = get_collection("complaints")
    complaints = list(
        complaints_col.find(
            {"latitude": {"$ne": None}, "longitude": {"$ne": None}},
            {
                "complaint_id": 1,
                "issue_type": 1,
                "address": 1,
                "status": 1,
                "priority": 1,
                "image_url": 1,
                "latitude": 1,
                "longitude": 1,
                "_id": 0,
            },
        )
    )
    return jsonify(complaints)


@public_bp.route("/score/<phone>")
def score(phone):
    return jsonify(get_eco_score(phone.strip()))
