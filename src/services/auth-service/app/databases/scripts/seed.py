
import uuid_utils as uuid
import bcrypt
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from databases.models import RoleType, roles, features, matrix_permission, auth_credentials
from config import config
from PermissionEnum import PermissionEnum, Feature


# customer_id_1 = uuid.uuid7(config.CUSTOMER_1)
# customer_id_2 = uuid.uuid7(config.CUSTOMER_2)
# customer_id_3 = uuid.uuid7(config.CUSTOMER_3)
# customer_id_4 = uuid.uuid7(config.MODERATOR)
# customer_id_5 = uuid.uuid7(config.MERCHANT)
customer_id = [
    uuid.UUID(config.CUSTOMER_1),
    uuid.UUID(config.CUSTOMER_2),
    uuid.UUID(config.CUSTOMER_3),
    uuid.UUID(config.MODERATOR),
    uuid.UUID(config.MERCHANT)
]

role_id = [
    RoleType.customer,
    RoleType.inactive_customer,
    RoleType.bank_teller,
    RoleType.moderator,
    RoleType.merchant
]

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

async def seed_auth_db(session: AsyncSession):
    roles_data = [
        {"role_id": RoleType.customer, "role_name": "customer"},
        {"role_id": RoleType.inactive_customer, "role_name": "inactive_customer"},
        {"role_id": RoleType.moderator, "role_name": "moderator"},
        {"role_id": RoleType.bank_teller, "role_name": "bank_teller"},
        {"role_id": RoleType.merchant, "role_name": "merchant"},
    ]

    stmt = insert(roles).values(roles_data)

    stmt = stmt.on_conflict_do_nothing(index_elements=['role_id'])

    await session.execute(stmt)
    await session.flush()

    auth_data= []
    
    for i in range(len(email)):
        auth_data.append({"customer_id": customer_id[i],
                         "role_id": role_id[i],
                         "email": email[i],
                         "phone": phone[i],
                         "password": bcrypt.hashpw((config.PASSWORD).encode('utf-8'), bcrypt.gensalt()).decode('utf-8')})
    stmt = insert(auth_credentials).values(auth_data)

    stmt = stmt.on_conflict_do_nothing(index_elements=['customer_id'])

    await session.execute(stmt)
    await session.flush()

    feature = [
        {"feature_id": Feature.USER, "feature_name": "UserFeature"},
        {"feature_id": Feature.TUITION, "feature_name": "TuitionFeature"}
    ]

    stmt = insert(features).values(feature)

    conn = stmt.on_conflict_do_nothing(index_elements=['feature_name'])
    await session.execute(conn)
    await session.flush()

    matrix = [
        {"role_id": RoleType.customer, "feature_id": Feature.USER, "permission": int(PermissionEnum.VIEW | PermissionEnum.EDIT)},
        {"role_id": RoleType.inactive_customer, "feature_id": Feature.USER,"permission": int(PermissionEnum.VIEW)},
        {"role_id": RoleType.moderator, "feature_id": Feature.USER,"permission": int(PermissionEnum.VIEW | PermissionEnum.ADD | PermissionEnum.EDIT | PermissionEnum.BANNED)},
        {"role_id": RoleType.bank_teller, "feature_id": Feature.USER,"permission": int(PermissionEnum.VIEW)},
        {"role_id": RoleType.merchant, "feature_id": Feature.USER,"permission": int(PermissionEnum.VIEW | PermissionEnum.EDIT)},

        {"role_id": RoleType.customer, "feature_id": Feature.TUITION, "permission": int(PermissionEnum.VIEW | PermissionEnum.APPROVE)},
        {"role_id": RoleType.inactive_customer, "feature_id": Feature.TUITION,"permission": int(PermissionEnum.NONE)},
        {"role_id": RoleType.moderator, "feature_id": Feature.TUITION,"permission": int(PermissionEnum.VIEW | PermissionEnum.ADD | PermissionEnum.EDIT | PermissionEnum.REFUND | PermissionEnum.BANNED)},
        {"role_id": RoleType.bank_teller, "feature_id": Feature.TUITION,"permission": int(PermissionEnum.VIEW)},
        {"role_id": RoleType.merchant, "feature_id": Feature.TUITION,"permission": int(PermissionEnum.VIEW)},
    ]

    stmt = insert(matrix_permission).values(matrix)

    conn = stmt.on_conflict_do_nothing(index_elements=['role_id', 'feature_id'])
    await session.execute(conn)
    await session.flush()

