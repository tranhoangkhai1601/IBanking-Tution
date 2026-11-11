
from datetime import datetime
import uuid
from enum import IntEnum
from decimal import Decimal
from sqlalchemy import Index, ForeignKey, String, Integer, Boolean, func, Numeric, PrimaryKeyConstraint, ForeignKeyConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

class Base(DeclarativeBase):
    pass

class statusType(IntEnum):
    PAID = 3000
    UNPAID = 3001
    DELETED = 3002
    LATED = 3003

# TODO: Default just TDTU my love
class MerchantType(IntEnum):
    TDTU = 3000

class OutBoxStatus(IntEnum):
    NOTSEND = 10
    SUCCESS = 11
    FAILED = 12
    PROCESSING = 13

class Students(Base):
    __tablename__ = "Students"

    merchant_code: Mapped[MerchantType] = mapped_column(default=MerchantType.TDTU)
    student_id: Mapped[str] = mapped_column(String(50))
    full_name: Mapped[str]

    __table_args__ = (
        PrimaryKeyConstraint("merchant_code", "student_id"),
    )

class Tuition(Base):
    __tablename__ = "Tuition"

    tuition_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=func.uuidv7())
    student_id: Mapped[str] = mapped_column(String(50) ,index=True)
    merchant_code: Mapped[MerchantType] = mapped_column(default=MerchantType.TDTU)

    merchant_account_id: Mapped[uuid.UUID] = mapped_column(index=True)

    # TODO: Decimal('string') when we calc anything, we must apply this method :))
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    semester: Mapped[int] = mapped_column(Integer) # TODO: 1 2 3
    academic_year: Mapped[int] = mapped_column(Integer)
    status: Mapped[statusType] = mapped_column(Integer)
    expires_at: Mapped[datetime]
    create_at: Mapped[datetime] = mapped_column(server_default=func.now())
    update_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        ForeignKeyConstraint(["merchant_code", "student_id"], ["Students.merchant_code", "Students.student_id"]),
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