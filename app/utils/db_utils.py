from sqlalchemy import create_engine, MetaData, Table, Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.sql import text
from pathlib import Path
import json
from datetime import datetime

# 创建元数据对象
metadata = MetaData()

# 定义对话会话表
conversations = Table(
    'conversations', 
    metadata,
    Column('id', String, primary_key=True),
    Column('user_id', String, nullable=True),
    Column('session_title', String, nullable=False, default='新对话'),
    Column('model_name', String, nullable=False),
    Column('timestamp', DateTime, nullable=False),
    Column('metadata', Text, nullable=False)
)

# 定义消息表
messages = Table(
    'messages',
    metadata,
    Column('id', String, primary_key=True),
    Column('conversation_id', String, ForeignKey('conversations.id'), nullable=False),
    Column('role', String, nullable=False),  # user, assistant, system
    Column('content', Text, nullable=False),
    Column('sequence_id', Integer, nullable=False),
    Column('timestamp', DateTime, nullable=False),
    Column('feedback', String, nullable=True) # like, dislike
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
        # 创建消息全文检索索引
        conn.execute(text('''
        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
            id,
            conversation_id,
            content,
            content='messages',
            content_rowid='rowid'
        )
        '''))
        
        # 创建消息触发器保持 FTS 索引同步
        conn.execute(text('''
        CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
            INSERT INTO messages_fts(rowid, id, conversation_id, content)
            VALUES (new.rowid, new.id, new.conversation_id, new.content);
        END
        '''))
        
        conn.execute(text('''
        CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, id, conversation_id, content)
            VALUES('delete', old.rowid, old.id, old.conversation_id, old.content);
        END
        '''))
        
        conn.execute(text('''
        CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, id, conversation_id, content)
            VALUES('delete', old.rowid, old.id, old.conversation_id, old.content);
            INSERT INTO messages_fts(rowid, id, conversation_id, content)
            VALUES (new.rowid, new.id, new.conversation_id, new.content);
        END
        '''))
        
        conn.commit()