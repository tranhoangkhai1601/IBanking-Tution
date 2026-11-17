
from enum import IntFlag, IntEnum

class PermissionEnum(IntFlag):
    NONE = 0
    VIEW = 1
    ADD = 2
    EDIT = 4
    DELETE = 8
    APPROVE = 16
    REFUND = 32
    BANNED = 64

class Feature(IntEnum):
    USER = 3000
    TUITION = 3001