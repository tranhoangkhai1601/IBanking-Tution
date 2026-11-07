
import uuid
from datetime import datetime
from enum import IntEnum
from sqlalchemy import func, Index, ForeignKey, String, Integer, Float
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

class StatusType(IntEnum):
    PENDING = 10
    SUCCESS = 11
    FAILED = 12
    EXPIRED = 13
    CANCELLED = 14
    REFUNDED = 15

class Base(DeclarativeBase):
    pass

class Transactions(Base):
    __tablename__ = "Transactions"

    transaction_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=func.uuidv7())
    account_id: Mapped[uuid.UUID]# = mapped_column(index=True)
    tuition_id: Mapped[uuid.UUID]# = mapped_column(index=True)
    amount: Mapped[float] = mapped_column(Float)
    description: Mapped[str] = mapped_column(String, nullable=True)
    status: Mapped[StatusType] = mapped_column(Integer)
    idempotency_key: Mapped[str] = mapped_column(unique=True)
    create_at: Mapped[datetime] = mapped_column(primary_key=True, server_default=func.now())
    update_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    extra_data: Mapped[dict] = mapped_column(JSONB, server_default="{}")

    __table_args__ = (
        Index("ix_transactions_tuition_history", 'tuition_id', 'create_at'),
        Index("ix_transactions_account", "account_id"),
        Index("ix_transactions_status", "status"),
        Index("ix_transactions_extra", "extra_data", postgresql_using="gin"),
    )