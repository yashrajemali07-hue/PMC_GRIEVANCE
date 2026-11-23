from datetime import datetime

from bson import ObjectId
from pymongo import ReturnDocument

from .db import get_collection
from .models.user import get_user_level


def get_eco_score(identifier):
    users_col = get_collection("users")
    user_query = {"email": identifier.lower()}
    if ObjectId.is_valid(identifier):
        user_query = {"$or": [{"email": identifier.lower()}, {"_id": ObjectId(identifier)}]}
    user = users_col.find_one(user_query)
    if user:
        return {
            "score": user.get("eco_points", 0),
            "level": get_user_level(user.get("eco_points", 0)),
            "complaints": get_collection("complaints").count_documents({"user_id": str(user["_id"])}),
            "actions": get_collection("eco_actions").count_documents({"user_id": str(user["_id"])}),
        }

    complaints_col = get_collection("complaints")
    eco_actions_col = get_collection("eco_actions")
    complaints_count = complaints_col.count_documents({"phone": identifier})
    actions_count = eco_actions_col.count_documents({"user": identifier})
    score = (complaints_count * 5) + (actions_count * 10)

    return {
        "score": score,
        "level": get_user_level(score),
        "complaints": complaints_count,
        "actions": actions_count,
    }


def generate_complaint_id():
    year = datetime.now().year
    counters = get_collection("counters")
    counter = counters.find_one_and_update(
        {"_id": f"complaint_{year}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return f"ECO-{year}-{str(counter['seq']).zfill(4)}"


def add_eco_points(user_id, points):
    """Reward verified citizens for useful participation."""
    if user_id:
        get_collection("users").update_one({"_id": ObjectId(user_id)}, {"$inc": {"eco_points": points}})
