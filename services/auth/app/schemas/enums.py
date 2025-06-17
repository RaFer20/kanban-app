"""
Defines enumerations for user roles and other schema-related constants.
"""

from enum import Enum

class UserRole(str, Enum):
    """
    Enum representing possible user roles in the system.

    Attributes:
        user: Standard authenticated user.
        admin: User with administrative privileges.
        guest: Limited-access guest user.
    """
    user = "user"
    admin = "admin"
    guest = "guest"
