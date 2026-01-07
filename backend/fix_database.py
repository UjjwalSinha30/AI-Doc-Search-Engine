"""
Direct database fix script to remove old constraint and add new composite constraint
Run this to fix the file_hash uniqueness issue
"""
import os
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Get the path to the .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError(f"DATABASE_URL not set in .env file at {env_path}")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def fix_database():
    """Remove old unique constraint and add composite constraint"""
    session = SessionLocal()
    
    try:
        # Get database type
        db_type = SQLALCHEMY_DATABASE_URL.split(":")[0]
        
        if "mysql" in db_type:
            # For MySQL
            try:
                # Drop the old unique constraint if it exists
                session.execute(text("""
                    ALTER TABLE documents DROP INDEX ix_documents_file_hash
                """))
                print("✅ Dropped old unique constraint on file_hash")
            except Exception as e:
                print(f"⚠️  Could not drop old constraint (may not exist): {e}")
            
            # Add the new composite unique constraint
            try:
                session.execute(text("""
                    ALTER TABLE documents ADD UNIQUE KEY uix_filehash_userid (file_hash, user_id)
                """))
                print("✅ Added new composite unique constraint on (file_hash, user_id)")
            except Exception as e:
                print(f"⚠️  Could not add new constraint (may already exist): {e}")
                
        elif "sqlite" in db_type:
            # For SQLite - more complex, requires table recreation
            print("Note: SQLite requires table recreation for constraint changes")
            print("Skipping SQLite migration - please delete the database and recreate")
            return
        
        session.commit()
        print("✅ Database migration completed successfully!")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error during migration: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    fix_database()
