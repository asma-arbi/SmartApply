from pathlib import Path
from urllib.parse import unquote, urlparse

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
SQL_PATHS = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
ENV_PATH = ROOT / ".env"


def load_database_url() -> str:
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit("DATABASE_URL missing in .env")


url = urlparse(load_database_url())
conn = psycopg2.connect(
    host=url.hostname,
    port=url.port or 5432,
    dbname=(url.path or "/postgres").lstrip("/"),
    user=unquote(url.username or ""),
    password=unquote(url.password or ""),
    sslmode="require",
    connect_timeout=20,
)
conn.autocommit = True
cur = conn.cursor()
for path in SQL_PATHS:
    cur.execute(path.read_text(encoding="utf-8"))
    print("APPLIED", path.name)
print("MIGRATION_OK")
cur.execute(
    """
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name like 'post%'
    order by table_name
    """
)
print("TABLES", [row[0] for row in cur.fetchall()])
cur.close()
conn.close()
