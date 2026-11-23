from datetime import datetime

from flask import Blueprint, current_app, flash, redirect, render_template, request, session, url_for

from ..db import get_collection
from ..services import add_eco_points
from ..utils import save_image, serialize_documents, timeline_entry


admin_bp = Blueprint("admin", __name__)


def is_admin_authenticated():
    return session.get("admin") is True


@admin_bp.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if username == current_app.config["ADMIN_USER"] and password == current_app.config["ADMIN_PASS"]:
            session["admin"] = True
            flash("Welcome to EcoTrack Admin Panel!", "success")
            return redirect(url_for("admin.admin_dashboard"))

        flash("Invalid credentials. Please try again.", "danger")

    return render_template("admin_login.html")


@admin_bp.route("/admin/logout")
def admin_logout():
    session.pop("admin", None)
    flash("Logged out successfully.", "info")
    return redirect(url_for("admin.admin_login"))


@admin_bp.route("/admin")
def admin_dashboard():
    if not is_admin_authenticated():
        return redirect(url_for("admin.admin_login"))

    complaints_col = get_collection("complaints")
    eco_actions_col = get_collection("eco_actions")

    status_filter = request.args.get("status", "")
    issue_filter = request.args.get("issue_type", "")
    area_filter = request.args.get("area", "")
    priority_filter = request.args.get("priority", "")
    query = {}

    if status_filter:
        query["status"] = status_filter
    if issue_filter:
        query["issue_type"] = issue_filter
    if area_filter:
        query["ward"] = area_filter
    if priority_filter:
        query["priority"] = priority_filter

    complaints = serialize_documents(list(complaints_col.find(query).sort("created_at", -1)))
    area_stats = list(complaints_col.aggregate([{"$group": {"_id": "$ward", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]))
    issue_stats = list(complaints_col.aggregate([{"$group": {"_id": "$issue_type", "count": {"$sum": 1}}}]))
    status_stats = list(complaints_col.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]))
    most_affected = area_stats[0]["_id"] if area_stats and area_stats[0]["_id"] else "Not available"
    stats = {
        "total": complaints_col.count_documents({}),
        "pending": complaints_col.count_documents({"status": "Pending"}),
        "in_progress": complaints_col.count_documents({"status": "In Progress"}),
        "resolved": complaints_col.count_documents({"status": "Resolved"}),
        "high_priority": complaints_col.count_documents({"priority": "High"}),
        "most_affected_area": most_affected,
        "eco_actions": eco_actions_col.count_documents({}),
    }
    chart_data = {
        "status_labels": [item["_id"] or "Unknown" for item in status_stats],
        "status_values": [item["count"] for item in status_stats],
        "issue_labels": [item["_id"] or "Unknown" for item in issue_stats],
        "issue_values": [item["count"] for item in issue_stats],
    }
    areas = [item["_id"] for item in area_stats if item["_id"]]

    return render_template(
        "admin.html",
        complaints=complaints,
        stats=stats,
        status_filter=status_filter,
        issue_filter=issue_filter,
        area_filter=area_filter,
        priority_filter=priority_filter,
        areas=areas,
        chart_data=chart_data,
    )


@admin_bp.route("/admin/update/<complaint_id>", methods=["POST"])
def update_complaint(complaint_id):
    if not is_admin_authenticated():
        return redirect(url_for("admin.admin_login"))

    complaints_col = get_collection("complaints")
    old_complaint = complaints_col.find_one({"complaint_id": complaint_id})
    new_status = request.form.get("status", "Pending")
    worker = request.form.get("assigned_worker", "").strip()
    resolution_image = save_image(request.files.get("resolution_image"))

    update_doc = {
        "status": new_status,
        "assigned_worker": worker or None,
        "updated_at": datetime.now(),
    }
    if resolution_image:
        update_doc["resolution_image"] = resolution_image

    note = f"Status updated to {new_status}"
    if worker:
        note += f" | Assigned to: {worker}"

    complaints_col.update_one(
        {"complaint_id": complaint_id},
        {
            "$set": update_doc,
            "$push": {"timeline": timeline_entry(new_status, note)},
        },
    )

    if old_complaint and old_complaint.get("status") != "Resolved" and new_status == "Resolved":
        add_eco_points(old_complaint.get("user_id"), 15)

    flash(f"Complaint {complaint_id} updated successfully.", "success")
    return redirect(url_for("admin.admin_dashboard"))


@admin_bp.route("/admin/delete/<complaint_id>", methods=["POST"])
def delete_complaint(complaint_id):
    if not is_admin_authenticated():
        return redirect(url_for("admin.admin_login"))

    complaints_col = get_collection("complaints")
    complaints_col.delete_one({"complaint_id": complaint_id})
    flash(f"Complaint {complaint_id} deleted.", "warning")
    return redirect(url_for("admin.admin_dashboard"))
