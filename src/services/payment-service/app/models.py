
import uuid
from datetime import datetime
from enum import IntEnum
from decimal import Decimal
from sqlalchemy import func, Index, ForeignKey, String, Integer, Float, Numeric
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

class StatusType(IntEnum):
    PENDING = 10
    SUCCESS = 11
    FAILED = 12
    EXPIRED = 13
    CANCELLED = 14
    REFUNDED = 15

class OutBoxStatus(IntEnum):
    NOTSEND = 10
    SUCCESS = 11
    FAILED = 12
    PROCESSING = 13
    
class Base(DeclarativeBase):
    pass

class Transactions(Base):
    __tablename__ = "Transactions"

    transaction_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=func.uuidv7())
    account_id: Mapped[uuid.UUID]# = mapped_column(index=True)
    tuition_id: Mapped[uuid.UUID | None]# = mapped_column(index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
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

class Outbox_Events(Base):
    __tablename__ = "Outbox_Events"

    event_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=func.uuidv7())
    aggregate_type: Mapped[str] = mapped_column(String(50))
    aggregate_id: Mapped[str] = mapped_column(String(50)) 
    event_type: Mapped[str] = mapped_column(String(50)) 
    payload: Mapped[dict] = mapped_column(JSONB) 
    
    status: Mapped[OutBoxStatus] = mapped_column(Integer, default=10, index=True)
    create_at: Mapped[datetime] = mapped_column(server_default=func.now())