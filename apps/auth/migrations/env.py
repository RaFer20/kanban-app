from logging.config import fileConfig
from sqlalchemy import create_engine, pool
from alembic import context
from app.core.config import get_settings
from app.db.base import Base
from app.models import user, refresh_token

# Alembic Config object
config = context.config

# Load logging config from .ini
assert config.config_file_name is not None
fileConfig(config.config_file_name)

# Load app settings (.env and such)
print("Starting Alembic env.py")

settings = get_settings()
print("Settings loaded:", settings.database_url_sync)

config.set_main_option("sqlalchemy.url", settings.database_url_sync)

target_metadata = Base.metadata
print("Target metadata loaded:", target_metadata)

def run_migrations_offline() -> None:
    print("Running migrations offline")
    url = settings.database_url_sync
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()
    print("Offline migration done")

def run_migrations_online() -> None:
    print("Running migrations online")
    connectable = create_engine(settings.database_url_sync, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()
    print("Online migration done")

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

print("Alembic env.py finished")
