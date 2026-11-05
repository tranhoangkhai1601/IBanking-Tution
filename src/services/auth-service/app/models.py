import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class Auth_Credentials(Base):
    __tablename__ = "Auth_Credentials"

    auth_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=func.uuidv7(monotonic=True))
    customer_id: Mapped[uuid.UUID] = mapped_column(server_default=func.uuidv7(monotonic=True))
    role: Mapped[str | None]
    password: Mapped[str | None]
    password_changed_at: Mapped[datetime | None]
    create_at: Mapped[datetime]
    update_at: Mapped[datetime]

class Matrix_Permission(Base):
    __tablename__ = "Matrix_Permission"

    id: Mapped[int] = mapped_column(primary_key=True)
    description: Mapped[str | None]
    feature_name: Mapped[str | None]
    role_admin: Mapped[int]
    role_moderator: Mapped[int]
    role_bank_teller: Mapped[int]
    role_customer: Mapped[int]

class Auth_Sessions(Base):
    __tablename__ = "Auth_Sessions"

    session_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=func.uuidv7(monotonic=True))
    customer_id: Mapped[uuid.UUID] = mapped_column(unique=True, server_default=func.uuidv7(monotonic=True))
    refresh_token: Mapped[str] = mapped_column(unique=True)
    ip_address: Mapped[str] = mapped_column(nullable=True)
    device_info: Mapped[str] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(default=False)
    expires_at: Mapped[datetime]
    create_at: Mapped[datetime]