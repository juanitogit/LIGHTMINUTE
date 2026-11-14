"""Database readiness must stay bounded, optional and free of credentials."""
import os
from unittest.mock import MagicMock, call, patch

from fastapi.testclient import TestClient
from tether_engine.api.main import app


def test_database_readiness_is_optional_without_configuration():
    with patch.dict(os.environ, {"DATABASE_URL": ""}):
        response = TestClient(app).get("/api/database/health")
    assert response.status_code == 503
    assert response.json()["detail"] == "Database is not configured"


def test_database_readiness_checks_query_and_closes_connection():
    connection = MagicMock()
    connection.__enter__.return_value = connection
    connection.execute.return_value.fetchone.return_value = (1,)
    with patch.dict(os.environ, {"DATABASE_URL": "postgresql://user:private@db/test"}), \
            patch("tether_engine.api.database.psycopg.connect", return_value=connection) as connect:
        response = TestClient(app).get("/api/database/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "provider": "neon", "connected": True}
    assert connect.call_args.kwargs["connect_timeout"] == 5
    assert "options" not in connect.call_args.kwargs
    assert connection.execute.call_args_list == [
        call("SET LOCAL statement_timeout = '5s'"), call("SELECT 1")]
    connection.__exit__.assert_called_once()
    assert "private" not in response.text


def test_database_connection_failure_does_not_disclose_the_dsn():
    import psycopg
    with patch.dict(os.environ, {"DATABASE_URL": "postgresql://user:private@db/test"}), \
            patch("tether_engine.api.database.psycopg.connect",
                  side_effect=psycopg.OperationalError("password private for user at db")):
        response = TestClient(app).get("/api/database/health")
    assert response.status_code == 503
    assert response.json()["detail"] == "Database connection unavailable"
    assert "private" not in response.text
