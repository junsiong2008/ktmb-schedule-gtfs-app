import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Environment variables
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASS = os.environ.get("DB_PASS", "password")
DB_NAME = os.environ.get("DB_NAME", "ktmb_gtfs")
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")

# Construct connection string
if DB_HOST.startswith("/"):
    # Cloud SQL Unix Socket
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@/{DB_NAME}?host={DB_HOST}"
else:
    # TCP
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
