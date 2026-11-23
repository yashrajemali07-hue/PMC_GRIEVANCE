import uuid
from datetime import datetime
from pathlib import Path

from flask import current_app


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]


def save_image(file_storage):
    if not file_storage or not file_storage.filename or not allowed_file(file_storage.filename):
        return None

    ext = file_storage.filename.rsplit(".", 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = Path(current_app.config["UPLOAD_FOLDER"])
    upload_dir.mkdir(parents=True, exist_ok=True)

    filepath = upload_dir / filename
    file_storage.save(filepath)

    return f"/static/uploads/{filename}"


def serialize_document(document):
    if document and "_id" in document:
        document["_id"] = str(document["_id"])
    return document


def serialize_documents(documents):
    return [serialize_document(document) for document in documents]


def timeline_entry(status, note):
    return {
        "status": status,
        "timestamp": datetime.now(),
        "note": note,
    }
