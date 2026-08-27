import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get("REVENUE_DB_PATH", "data/final/revenue_leaks.db")

def get_db_path() -> str:
    return DB_PATH

@contextmanager
def get_connection(row_factory: bool = True):
    """Context manager for SQLite connections. Auto-commits on success, rolls back on error."""
    conn = sqlite3.connect(get_db_path())
    if row_factory:
        conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def get_cursor():
    """Returns a (connection, cursor) tuple. Caller is responsible for closing."""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn, conn.cursor()
