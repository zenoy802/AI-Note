import sqlite3
import json
import os
from pathlib import Path

def view_conversations_db(limit=20):
    """Display contents of the conversations database"""
    # Determine the correct path to the database
    db_path = Path("conversations.db")
    if not db_path.exists():
        db_path = Path("data/conversations.db")
    
    if not db_path.exists():
        print(f"Database not found. Current directory: {os.getcwd()}")
        return
        
    print(f"Opening database at: {db_path}")
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables in database:", [table['name'] for table in tables])
    
    # For each table, show some data
    for table in tables:
        table_name = table['name']
        print(f"\n--- Contents of {table_name} ---")
        
        # Get column names
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [col['name'] for col in cursor.fetchall()]
        print(f"Columns: {columns}")
        
        # Get data
        cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit}")
        rows = cursor.fetchall()
        
        # Pretty print the results
        for row in rows:
            row_dict = dict(row)
            # For fields that might contain JSON data, try to parse them
            for key, value in row_dict.items():
                if isinstance(value, str) and (value.startswith('{') or value.startswith('[')):
                    try:
                        row_dict[key] = json.loads(value)
                    except:
                        pass  # Keep as string if not valid JSON
            
            print(f"\nRecord:")
            for key, value in row_dict.items():
                print(f"  {key}: {value}")
    
    conn.close()

if __name__ == "__main__":
    view_conversations_db() 