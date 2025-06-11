# Use official Python 3.11 slim image
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies needed for asyncpg and psycopg
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Poetry lock files and install dependencies
COPY pyproject.toml poetry.lock* /app/

RUN pip install --upgrade pip
RUN pip install poetry# Use official Python 3.11 slim image
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies needed for asyncpg and psycopg
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Poetry lock files and install dependencies
COPY pyproject.toml poetry.lock* /app/

RUN pip install --upgrade pip
RUN pip install poetry

# Install dependencies without creating virtualenv inside container
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --without dev

# Copy the rest of the application code
COPY . /app

# Copy start.sh into the container
COPY start.sh /app/start.sh

# Make sure it's executable (belt-and-suspenders safety)
RUN chmod +x /app/start.sh

# Expose port 8000
EXPOSE 8000

# Replace CMD with start.sh to run Alembic and then Uvicorn
CMD ["./start.sh"]


# Install dependencies without creating virtualenv inside container
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --without dev

# Copy the rest of the application code
COPY . /app

# Expose port 8000
EXPOSE 8000

# Default command to run the FastAPI app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
