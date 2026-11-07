"""Apply 006_post_hides.sql via Prisma DIRECT_URL (or DATABASE_URL)."""
from __future__ import annotations

import os
import pathlib
import re
import sys

try:
    import psycopg2
except ImportError:
    import subprocess

    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])
    import psycopg2

root = pathlib.Path(__file__).resolve().parents[1]


def load_env() -> None:
    for name in (".env.local", ".env"):
        path = root / name
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


load_env()
url = os.environ.get("DIRECT_URL") or os.environ.get("DATABASE_URL")
if not url:
    raise SystemExit("DATABASE_URL / DIRECT_URL manquant")

sql = (root / "supabase" / "migrations" / "006_post_hides.sql").read_text(encoding="utf-8")
conn = psycopg2.connect(url)
conn.autocommit = True
try:
    with conn.cursor() as cur:
        cur.execute(sql)
    print("OK applied 006_post_hides")
finally:
    conn.close()
