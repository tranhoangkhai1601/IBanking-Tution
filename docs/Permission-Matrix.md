## Customer_db
```
class EntryTypeEnum(IntEnum):
    IN = 3000
    OUT = 3001

class LanguageType(IntEnum):
    en = 10
    vi = 11

class AccountType(IntEnum):
    debit = 10
    credit = 11
```

## Auth_db
```
class RoleType(IntEnum):
    customer = 3000
    inactive_customer=3001
    moderator = 3002
    bank_teller = 3003
```

## Payment_db
```
class StatusType(IntEnum):
    PENDING = 10
    SUCCESS = 11
    FAILED = 12
    EXPIRED = 13
    CANCELLED = 14
    REFUNDED = 15

```