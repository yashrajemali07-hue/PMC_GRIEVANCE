from flask import current_app, g
from pymongo import MongoClient
from pymongo.errors import PyMongoError

try:
    import certifi
except ImportError:
    certifi = None


COLLECTION_NAMES = {
    "complaints": "complaints",
    "eco_actions": "eco_actions",
    "users": "users",
    "counters": "counters",
}


def init_mongo(app):
    app.config["UPLOAD_FOLDER"].mkdir(parents=True, exist_ok=True)


def get_mongo_client():
    if "mongo_client" not in g:
        g.mongo_client = MongoClient(current_app.config["MONGODB_URI"], **mongo_client_options())
    return g.mongo_client


def mongo_client_options():
    options = {
        "serverSelectionTimeoutMS": current_app.config["MONGODB_SERVER_SELECTION_TIMEOUT_MS"],
        "connectTimeoutMS": current_app.config["MONGODB_CONNECT_TIMEOUT_MS"],
        "socketTimeoutMS": current_app.config["MONGODB_SOCKET_TIMEOUT_MS"],
    }
    ca_file = current_app.config["MONGODB_TLS_CA_FILE"]
    uri = current_app.config["MONGODB_URI"].lower()

    if ca_file:
        options["tlsCAFile"] = ca_file
    elif certifi and ("mongodb+srv://" in uri or "mongodb.net" in uri):
        options["tlsCAFile"] = certifi.where()

    return options


def get_db():
    return get_mongo_client()[current_app.config["MONGODB_DB_NAME"]]


def get_collection(name):
    collection_name = COLLECTION_NAMES[name]
    collection = get_db()[collection_name]
    ensure_indexes(collection_name, collection)
    return collection


def ensure_indexes(collection_name, collection):
    indexed = g.setdefault("mongo_indexed_collections", set())
    if collection_name in indexed:
        return

    if collection_name == "complaints":
        collection.create_index("complaint_id", unique=True)
        collection.create_index("phone")
        collection.create_index("user_id")
        collection.create_index("ward")
        collection.create_index("priority")
        collection.create_index("status")
        collection.create_index("issue_type")
        collection.create_index("created_at")
    elif collection_name == "eco_actions":
        collection.create_index("user")
        collection.create_index("user_id")
        collection.create_index("created_at")
    elif collection_name == "users":
        collection.create_index("email", unique=True)
        collection.create_index("verified")
    indexed.add(collection_name)


def ping_database():
    try:
        get_mongo_client().admin.command("ping")
        return True, None
    except PyMongoError as exc:
        return False, str(exc)


def close_mongo_client(_exception=None):
    client = g.pop("mongo_client", None)
    if client is not None:
        client.close()
