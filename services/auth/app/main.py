"""
Main entrypoint for the Auth Service FastAPI application.

- Sets up the FastAPI app with CORS middleware and API routes.
- Seeds a guest user on startup if needed.
- Configures logging, metrics, and tracing.
"""

from contextlib import asynccontextmanager
import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import routes
from app.core.config import get_settings
from app.db.session import AsyncSessionLocal, engine
from app.seeds import create_guest_user_if_not_exists
from app.core import metrics
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter

# Observability imports
from prometheus_fastapi_instrumentator import Instrumentator
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from app.db.session import engine

from app.logging_config import setup_logging  # your logging setup helper

settings = get_settings()

# Setup structured logging to stdout in JSON format
setup_logging()
logger = logging.getLogger("auth")

# Setup OpenTelemetry Tracing
tracer_provider = TracerProvider()
trace.set_tracer_provider(tracer_provider)
otlp_exporter = OTLPSpanExporter(
    endpoint="http://otel-collector:4317", insecure=True  # Matches collector config
)
tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# Instrument SQLAlchemy for tracing
SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up the app and seeding guest user if needed...")
    async with AsyncSessionLocal() as db:
        await create_guest_user_if_not_exists(db)
    yield
    logger.info("Shutting down the app...")

app = FastAPI(title=settings.project_name, lifespan=lifespan)

# Middleware for CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] for testing only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instrument FastAPI app for Prometheus metrics and OpenTelemetry tracing
Instrumentator().instrument(app).expose(app)
FastAPIInstrumentor.instrument_app(app, tracer_provider=trace.get_tracer_provider())

# Add logging middleware for requests and responses
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(
        {
            "event": "request_start",
            "method": request.method,
            "path": str(request.url.path),
        }
    )
    response = await call_next(request)
    logger.info(
        {
            "event": "request_end",
            "method": request.method,
            "path": str(request.url.path),
            "status_code": response.status_code,
        }
    )
    return response

# Rate limiter setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler) #type: ignore

# Include your existing API routes
app.include_router(routes.router, prefix="/api/v1")

logger.info(f"Running {settings.project_name}")