
from enum import IntFlag

class Permission(IntFlag):
    VIEW = 1
    ADD = 2
    EDIT = 4
    DELETE = 8
    REFUND = 16
    BANNED = 32