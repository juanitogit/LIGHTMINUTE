"""Server-only Neon/Postgres connection. Never expose the DSN to clients."""
from contextlib import contextmanager
from collections.abc import Iterator
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

# Resolve independently of the working directory used to launch uvicorn.
# Deployment environment variables always take precedence over the local file.
load_dotenv(Path(__file__).resolve().parents[4] / ".env", override=False)


class DatabaseNotConfigured(RuntimeError):
    pass


@contextmanager
def get_connection() -> Iterator[psycopg.Connection]:
    """Open a short-lived transaction; commit/rollback and close on exit."""
    dsn = os.environ.get("DATABASE_URL", "").strip()
    if not dsn:
        raise DatabaseNotConfigured("Database is not configured")
    with psycopg.connect(dsn, connect_timeout=5) as connection:
        # Neon pooled endpoints reject this setting in startup options.
        # A transaction-local setting also avoids leaking state across pool users.
        connection.execute("SET LOCAL statement_timeout = '5s'")
        yield connection


def check_connection() -> bool:
    """Read-only readiness probe: does not create or alter database objects."""
    with get_connection() as connection:
        return connection.execute("SELECT 1").fetchone() == (1,)
