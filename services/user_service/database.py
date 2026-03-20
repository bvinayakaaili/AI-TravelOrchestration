"""
SQLite database layer for user_service.
Uses SQLAlchemy Core for lightweight, dependency-free DB access.
"""

import os
import json
import uuid
import logging
from datetime import datetime
from pathlib import Path

from sqlalchemy import (
    create_engine, text, Column, String, Integer, Boolean, Text, DateTime,
    MetaData, Table
)

logger = logging.getLogger("user_service.db")

DB_PATH = os.getenv("USER_DB_PATH", str(Path(__file__).parent / "users.db"))
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
metadata = MetaData()

# ─────────────────────────────────────────────
# Table Definitions
# ─────────────────────────────────────────────
users_table = Table("users", metadata,
    Column("id", String, primary_key=True),
    Column("email", String, unique=True, nullable=False),
    Column("password_hash", String, nullable=False),
    Column("home_city", String, default="hyd"),
    Column("preferred_budget", Integer, default=15000),
    Column("travel_style", String, default="general"),
    Column("created_at", String, nullable=False),
)

saved_plans_table = Table("saved_plans", metadata,
    Column("id", String, primary_key=True),
    Column("user_id", String, nullable=False),
    Column("destination", String, nullable=False),
    Column("query", Text, nullable=False),
    Column("plan_json", Text, nullable=False),   # JSON blob
    Column("is_favorite", Boolean, default=False),
    Column("created_at", String, nullable=False),
)

trip_history_table = Table("trip_history", metadata,
    Column("id", String, primary_key=True),
    Column("user_id", String, nullable=False),
    Column("query", Text, nullable=False),
    Column("response_json", Text, nullable=False),  # JSON blob
    Column("services_called", String, nullable=False),  # comma-separated
    Column("timestamp", String, nullable=False),
)

# Custom exceptions
class UserNotFoundError(Exception): pass
class UserAlreadyExistsError(Exception): pass


class DatabaseManager:
    def __init__(self):
        metadata.create_all(engine)
        logger.info(f"Database initialized at: {DB_PATH}")

    # ─────────────────────────────────────────────
    # User CRUD
    # ─────────────────────────────────────────────
    def create_user(self, email: str, password_hash: str, home_city: str = "hyd",
                    preferred_budget: int = 15000, travel_style: str = "general") -> dict:
        if self.get_user_by_email(email):
            raise UserAlreadyExistsError(f"Email {email} already exists")
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": password_hash,
            "home_city": home_city,
            "preferred_budget": preferred_budget,
            "travel_style": travel_style,
            "created_at": datetime.utcnow().isoformat(),
        }
        with engine.connect() as conn:
            conn.execute(users_table.insert().values(**user))
            conn.commit()
        return user

    def get_user(self, user_id: str) -> dict | None:
        with engine.connect() as conn:
            row = conn.execute(
                users_table.select().where(users_table.c.id == user_id)
            ).fetchone()
        return dict(row._mapping) if row else None

    def get_user_by_email(self, email: str) -> dict | None:
        with engine.connect() as conn:
            row = conn.execute(
                users_table.select().where(users_table.c.email == email)
            ).fetchone()
        return dict(row._mapping) if row else None

    def update_user(self, user_id: str, updates: dict) -> dict:
        with engine.connect() as conn:
            conn.execute(
                users_table.update()
                .where(users_table.c.id == user_id)
                .values(**updates)
            )
            conn.commit()
        return self.get_user(user_id)

    # ─────────────────────────────────────────────
    # Saved Plans CRUD
    # ─────────────────────────────────────────────
    def save_plan(self, user_id: str, destination: str, query: str,
                  plan_json: dict, is_favorite: bool = False) -> dict:
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "destination": destination,
            "query": query,
            "plan_json": json.dumps(plan_json),
            "is_favorite": is_favorite,
            "created_at": datetime.utcnow().isoformat(),
        }
        with engine.connect() as conn:
            conn.execute(saved_plans_table.insert().values(**record))
            conn.commit()
        record["plan_json"] = plan_json  # return deserialized
        return record

    def get_saved_plans(self, user_id: str) -> list:
        with engine.connect() as conn:
            rows = conn.execute(
                saved_plans_table.select()
                .where(saved_plans_table.c.user_id == user_id)
                .order_by(saved_plans_table.c.created_at.desc())
            ).fetchall()
        plans = []
        for row in rows:
            d = dict(row._mapping)
            d["plan_json"] = json.loads(d["plan_json"])
            plans.append(d)
        return plans

    def get_plan_by_id(self, plan_id: str) -> dict | None:
        with engine.connect() as conn:
            row = conn.execute(
                saved_plans_table.select().where(saved_plans_table.c.id == plan_id)
            ).fetchone()
        if not row:
            return None
        d = dict(row._mapping)
        d["plan_json"] = json.loads(d["plan_json"])
        return d

    def delete_plan(self, user_id: str, plan_id: str) -> bool:
        with engine.connect() as conn:
            result = conn.execute(
                saved_plans_table.delete()
                .where(saved_plans_table.c.id == plan_id)
                .where(saved_plans_table.c.user_id == user_id)
            )
            conn.commit()
        return result.rowcount > 0

    # ─────────────────────────────────────────────
    # Trip History CRUD
    # ─────────────────────────────────────────────
    def add_history(self, user_id: str, query: str, response_json: dict,
                    services_called: list) -> dict:
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "query": query,
            "response_json": json.dumps(response_json),
            "services_called": ",".join(services_called),
            "timestamp": datetime.utcnow().isoformat(),
        }
        with engine.connect() as conn:
            conn.execute(trip_history_table.insert().values(**record))
            conn.commit()
        record["response_json"] = response_json
        record["services_called"] = services_called
        return record

    def get_history(self, user_id: str, limit: int = 20) -> list:
        with engine.connect() as conn:
            rows = conn.execute(
                trip_history_table.select()
                .where(trip_history_table.c.user_id == user_id)
                .order_by(trip_history_table.c.timestamp.desc())
                .limit(limit)
            ).fetchall()
        records = []
        for row in rows:
            d = dict(row._mapping)
            d["response_json"] = json.loads(d["response_json"])
            d["services_called"] = d["services_called"].split(",")
            records.append(d)
        return records
