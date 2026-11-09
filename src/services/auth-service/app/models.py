
from enum import Enum, IntEnum, StrEnum
import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, func, Index, ForeignKey, UniqueConstraint, BIGINT, Sequence
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass
class RoleType(IntEnum):
    customer = 3000
    inactive_customer=3001
    moderator = 3002
    bank_teller = 3003

class Providers(IntEnum):
    google = 3000
    email = 3001
    phone = 3002
class Auth_Sessions(Base):
    __tablename__ = "Auth_Sessions"

    session_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=func.uuidv7())
    customer_id: Mapped[uuid.UUID] = mapped_column(index=True)
    refresh_token: Mapped[str] = mapped_column()
    ip_address: Mapped[str | None]
    device_info: Mapped[str | None]
    is_active: Mapped[bool] = mapped_column(default=False)
    expires_at: Mapped[datetime]
    create_at: Mapped[datetime] = mapped_column(primary_key=True, server_default=func.now())
    extra_data: Mapped[dict] = mapped_column(JSONB, server_default='{}')

    __table_args__ = (
        UniqueConstraint('refresh_token', 'create_at'),

        Index('ix_auth_sessions_extra', 'extra_data', postgresql_using='gin'),

        # TODO: Just enable when table have init value
        {
            "postgresql_partition_by": "RANGE (create_at)"
        }
    )


class Auth_Credentials(Base):
    __tablename__ = "Auth_Credentials"

    customer_id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    role_id: Mapped[RoleType] = mapped_column(ForeignKey("Roles.role_id"))
    password: Mapped[str | None]
    password_changed_at: Mapped[datetime | None] = mapped_column(server_default=func.now())
    create_at: Mapped[datetime] = mapped_column(server_default=func.now())
    update_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    extra_data: Mapped[dict] = mapped_column(JSONB, server_default='{}')

    __table_args__ = (
        Index('ix_auth_credential_extra', 'extra_data', postgresql_using='gin'),
    )

class Auth_Providers(Base):
    __tablename__ = "Auth_Providers"

    identity_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=func.uuidv7())
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("Auth_Credentials.customer_id"), index=True)

    # TODO: identity_hash is encrypt of Email, Phone - provider to identify which signin method
    provider: Mapped[Providers] = mapped_column(Integer)
    identity_hash: Mapped[str] = mapped_column(String, index=True)
    # TODO: Use HMAC for this case :)) Remember that if you read this note
    
    create_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        UniqueConstraint("provider", "identity_hash"),
    )

class Roles(Base):
    __tablename__ = "Roles"

    role_id: Mapped[RoleType] = mapped_column(Integer, primary_key=True)
    role_name: Mapped[str] = mapped_column(unique=True)
    extra_data: Mapped[dict] =  mapped_column(JSONB, server_default="{}")

    __table_args__ = (
        Index("ix_roles_extra", 'extra_data', postgresql_using='gin'),
    )

class Features(Base):
    __tablename__ = "Features"

    feature_id: Mapped[int] = mapped_column(
        Sequence("feature_id_seq", start=3000),
        primary_key=True
    )
    feature_name: Mapped[str] = mapped_column(unique=True)
    extra_data: Mapped[dict] =  mapped_column(JSONB, server_default="{}")

    __table_args__ = (
        Index("ix_features_extra", 'extra_data', postgresql_using='gin'),
    )

class Matrix_Permission(Base):
    __tablename__ = "Matrix_Permission"

    feature_id: Mapped[int] = mapped_column(ForeignKey("Features.feature_id"), primary_key=True)
    role_id: Mapped[RoleType] = mapped_column(ForeignKey("Roles.role_id"), primary_key=True)
    permission: Mapped[int] = mapped_column(BIGINT, default=0)
    extra_data: Mapped[dict] =  mapped_column(JSONB, server_default="{}")

    __table_args__ = (
        Index("ix_feature_role", "role_id", "feature_id"),
        Index("ix_matrix_permission_extra", 'extra_data', postgresql_using='gin'),
    )