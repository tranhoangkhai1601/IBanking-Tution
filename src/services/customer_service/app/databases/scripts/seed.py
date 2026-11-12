
import uuid_utils as uuid
from decimal import Decimal
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from databases.models import customers, customer_details, AccountType, LanguageType
from config import config

email = [
    "hungphi20112006@gmail.com",
    "tranhoangkhai271625@gmail.com",
    "julviadinh@gmail.com",
    "trankhai.16012005@gmail.com",
    "523v0003@student.tdtu.edu.vn"]

phone = [
    "0987654321",
    "0787716105",
    "0912345678",
    "0962481944",
    "0989617074"
]

customer_id = [
    uuid.UUID(config.CUSTOMER_1),
    uuid.UUID(config.CUSTOMER_2),
    uuid.UUID(config.CUSTOMER_3),
    uuid.UUID(config.MODERATOR),
    uuid.UUID(config.MERCHANT)
]

names = [
    "Vu Hung Phi",
    "Tran Hoang Khai",
    "Dinh Ngoc Hoa",
    "MOD",
    "TDTU"
]

async def seed_customer_data(session: AsyncSession):
    customers_data = []
    for i in range(5):
        customers_data.append({
            "customer_id": customer_id[i],
            "email": email[i],
            "phone": phone[i],
            "full_name": names[i],
            "status": True,
            "language": LanguageType.en
        })
    stmt = insert(customers).values(customers_data)

    conn = stmt.on_conflict_do_nothing(index_elements=['customer_id'])

    await session.execute(conn)
    await session.flush()

    # TODO: This is middle night so I'm burnout. This code is ugly :<>
    account_data = [
        # Account 1
        {"account_id": config.CUSTOMER_1_ACCOUNT_1,
        "customer_id": config.CUSTOMER_1,
        "account_num": config.CUSTOMER_1_ACCOUNT_NUM1,
        "account_type": AccountType.debit,
        "balance": Decimal(10_000_000),
        "account_active": True},

        {"account_id": config.CUSTOMER_1_ACCOUNT_2,
        "customer_id": config.CUSTOMER_1,
        "account_num": config.CUSTOMER_1_ACCOUNT_NUM2,
        "account_type": AccountType.debit,
        "balance": Decimal(12_000_000),
        "account_active": True},

        ## Account 2
        {"account_id": config.CUSTOMER_2_ACCOUNT_1,
        "customer_id": config.CUSTOMER_2,
        "account_num": config.CUSTOMER_2_ACCOUNT_NUM1,
        "account_type": AccountType.debit,
        "balance": Decimal(10_000_000),
        "account_active": True},

        {"account_id": config.CUSTOMER_2_ACCOUNT_2,
        "customer_id": config.CUSTOMER_2,
        "account_num": config.CUSTOMER_2_ACCOUNT_NUM2,
        "account_type": AccountType.debit,
        "balance": Decimal(17_000_000),
        "account_active": True},

        ## Account 3
        {"account_id": config.CUSTOMER_3_ACCOUNT_1,
        "customer_id": config.CUSTOMER_3,
        "account_num": config.CUSTOMER_3_ACCOUNT_NUM1,
        "account_type": AccountType.debit,
        "balance": Decimal(15_000_000),
        "account_active": True},

        ## Account 4 - MOD
        {"account_id": config.CUSTOMER_4_ACCOUNT_1,
        "customer_id": config.MODERATOR,
        "account_num": config.CUSTOMER_4_ACCOUNT_NUM1,
        "account_type": AccountType.mod,
        "balance": Decimal(0),
        "account_active": True},

        ## Account 5 - TDTU :))
        {"account_id": config.CUSTOMER_5_ACCOUNT_1,
        "customer_id": config.MERCHANT,
        "account_num": config.CUSTOMER_5_ACCOUNT_NUM1,
        "account_type": AccountType.organization,
        "balance": Decimal(0),
        "account_active": True}
    ]

    stmt = insert(customer_details).values(account_data)
    conn = stmt.on_conflict_do_nothing(index_elements=['account_id'])

    await session.execute(conn)
    await session.flush()