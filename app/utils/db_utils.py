from sqlalchemy import create_engine, MetaData, Table, Column, String, Text, DateTime
from sqlalchemy.sql import text
from pathlib import Path
import json
from datetime import datetime

# 创建元数据对象
metadata = MetaData()

# 定义对话表
conversations = Table(
    'conversations', 
    metadata,
    Column('id', String, primary_key=True),
    Column('model_name', String, nullable=False),
    Column('timestamp', DateTime, nullable=False),
    Column('user_input', Text, nullable=False),
    Column('model_response', Text, nullable=False),
    Column('metadata', Text, nullable=False)
)

def get_engine():
    """获取数据库引擎"""
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    db_path = data_dir / "conversations.db"
    
    # 创建 SQLAlchemy 引擎，启用外键约束
    return create_engine(f"sqlite:///{db_path}", future=True, 
                         connect_args={"check_same_thread": False})

def init_db():
    """初始化数据库，创建表结构"""
    engine = get_engine()
    
    # 创建表
    metadata.create_all(engine)
    
    # 执行原始 SQL 创建 FTS 虚拟表和触发器
    with engine.connect() as conn:
        # 创建全文检索索引
        conn.execute(text('''
        CREATE VIRTUAL TABLE IF NOT EXISTS conversations_fts USING fts5(
            id,
            user_input, 
            model_response,
            content='conversations',
            content_rowid='rowid'
        )
        '''))
        
        # 创建触发器保持 FTS 索引同步
        conn.execute(text('''
        CREATE TRIGGER IF NOT EXISTS conversations_ai AFTER INSERT ON conversations BEGIN
            INSERT INTO conversations_fts(rowid, id, user_input, model_response)
            VALUES (new.rowid, new.id, new.user_input, new.model_response);
        END
        '''))
        
        conn.execute(text('''
        CREATE TRIGGER IF NOT EXISTS conversations_ad AFTER DELETE ON conversations BEGIN
            INSERT INTO conversations_fts(conversations_fts, rowid, id, user_input, model_response)
            VALUES('delete', old.rowid, old.id, old.user_input, old.model_response);
        END
        '''))
        
        conn.execute(text('''
        CREATE TRIGGER IF NOT EXISTS conversations_au AFTER UPDATE ON conversations BEGIN
            INSERT INTO conversations_fts(conversations_fts, rowid, id, user_input, model_response)
            VALUES('delete', old.rowid, old.id, old.user_input, old.model_response);
            INSERT INTO conversations_fts(rowid, id, user_input, model_response)
            VALUES (new.rowid, new.id, new.user_input, new.model_response);
        END
        '''))
        
        conn.commit() 