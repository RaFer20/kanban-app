from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import all models here so they are registered with Base.metadata
from app.models.user import User
# (import other models as needed)

