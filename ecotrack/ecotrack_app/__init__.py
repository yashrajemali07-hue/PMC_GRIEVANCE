from flask import Flask

from .config import Config
from .db import close_mongo_client, init_mongo
from .routes.admin import admin_bp
from .routes.auth import auth_bp
from .routes.public import public_bp


def create_app():
    app = Flask(
        __name__,
        template_folder="../templates",
        static_folder="../static",
    )
    app.config.from_object(Config)

    init_mongo(app)
    register_blueprints(app)
    register_context_processors(app)
    register_teardown(app)

    return app


def register_blueprints(app):
    app.register_blueprint(public_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)


def register_context_processors(app):
    @app.context_processor
    def inject_template_globals():
        from flask import session

        return {"current_user": session.get("user")}


def register_teardown(app):
    app.teardown_appcontext(close_mongo_client)
