
from enum import IntEnum
from datetime import datetime
import uuid
from sqlalchemy import func, Index, String, Integer, Float, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

class Base(DeclarativeBase):
    pass

class EntryTypeEnum(IntEnum):
    IN = 3000
    OUT = 3001

class LanguageType(IntEnum):
    en = 10
    vi = 11

class AccountType(IntEnum):
    debit = 10
    credit = 11

class Customers(Base):
    __tablename__ = "Customers"

    customer_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=func.uuidv7())

    # TODO: encrypt for AES decrypt to get plaintext
    phone_encrypt: Mapped[str] = mapped_column(String(255))
    email_encrypt: Mapped[str] = mapped_column(String(255))

    # TODO: hash by HMAC just for look up when login
    phone_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email_hash: Mapped[str] = mapped_column(String(64), unique=True,index=True)

    full_name: Mapped[str]
    status: Mapped[bool] = mapped_column(default=True)
    language: Mapped[LanguageType] = mapped_column(Integer)
    create_at: Mapped[datetime] = mapped_column(server_default=func.now())
    update_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    delete_at: Mapped[datetime | None]
    description: Mapped[str | None]
    extra_data: Mapped[dict] = mapped_column(JSONB, server_default='{}')

    __table_args__ = (
        Index('ix_customers_extra', 'extra_data', postgresql_using='gin'),
    )



class Customer_Details(Base):
    __tablename__ = "Customer_Details"

    account_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=func.uuidv7())
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("Customers.customer_id"), index=True)
    account_type: Mapped[AccountType] = mapped_column(Integer, default=AccountType.credit)
    account_open_date: Mapped[datetime] = mapped_column(server_default=func.now())

    balance: Mapped[float] = mapped_column(Float, default=0.0)
    # TODO: IF have register feat in the future, change default account_active to False
    account_active: Mapped[bool] = mapped_column(default=True)

    description: Mapped[str | None]
    extra_data: Mapped[dict] = mapped_column(JSONB, server_default='{}')

    __table_args__ = (
        Index('ix_customer_details_extra', 'extra_data', postgresql_using='gin'),
    )

class Transaction_Lines(Base):
    __tablename__ = "Transaction_Lines"

    entry_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=func.uuidv7())
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("Customer_Details.account_id"))
    transaction_id: Mapped[uuid.UUID] = mapped_column(index=True)

    amount: Mapped[float] = mapped_column(Float)
    entry_type: Mapped[EntryTypeEnum] = mapped_column(Integer)
    description: Mapped[str]

    create_at: Mapped[datetime] = mapped_column(primary_key=True, server_default=func.now())
    extra_data: Mapped[dict] = mapped_column(JSONB, server_default='{}')

    __table_args__ = (
        Index("ix_transaction_line_extra", 'extra_data', postgresql_using='gin'),
        Index("ix_account_history", "account_id"),
        {
            "postgresql_partition_by": "RANGE (create_at)"
        },
    )
