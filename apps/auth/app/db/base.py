from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Do NOT import models here to avoid circular imports.
# Import models in your migration scripts or app startup if needed.

