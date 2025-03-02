import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any

from sqlalchemy import select, desc, and_, text, or_
from sqlalchemy.exc import SQLAlchemyError

from ..models.conversation import Conversation
from ..utils.db_utils import get_engine, init_db, conversations


class ConversationRepository:
    """对话存储库，处理SQLAlchemy Core操作"""
    
    def __init__(self):
        # 确保数据库结构初始化
        init_db()
        self.engine = get_engine()
        
        # 创建备份目录
        self.backup_dir = Path("data/backups")
        self.backup_dir.mkdir(exist_ok=True, parents=True)
    
    def save_conversation(self, conversation: Conversation) -> str:
        """保存对话到数据库和JSON备份"""
        try:
            # 准备插入数据
            insert_values = {
                'id': conversation.id,
                'model_name': conversation.model_name,
                'timestamp': conversation.timestamp,
                'user_input': conversation.user_input,
                'model_response': conversation.model_response,
                'metadata': json.dumps(conversation.metadata)
            }
            
            # 执行插入操作
            with self.engine.begin() as conn:
                conn.execute(conversations.insert().values(**insert_values))
                
            # 保存到JSON备份
            self._backup_to_json(conversation)
            
            return conversation.id
        except SQLAlchemyError as e:
            # 记录错误并重新抛出异常
            print(f"Error saving conversation: {e}")
            raise
    
    def get_conversation_by_id(self, conversation_id: str) -> Optional[Conversation]:
        """根据ID获取单个对话"""
        try:
            # 构建查询
            query = select(conversations).where(conversations.c.id == conversation_id)
            
            # 执行查询
            with self.engine.connect() as conn:
                result = conn.execute(query).first()
                
            if not result:
                return None
            
            # 将结果转换为Conversation对象
            return Conversation(
                id=result.id,
                model_name=result.model_name,
                timestamp=result.timestamp,
                user_input=result.user_input,
                model_response=result.model_response,
                metadata=json.loads(result.metadata)
            )
        except SQLAlchemyError as e:
            print(f"Error getting conversation: {e}")
            raise
    
    def get_conversations_by_time_range(
        self, 
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Conversation]:
        """按时间范围获取对话列表"""
        try:
            # 构建条件
            conditions = []
            if start_time:
                conditions.append(conversations.c.timestamp >= start_time)
            if end_time:
                conditions.append(conversations.c.timestamp <= end_time)
            
            # 构建查询
            query = select(conversations)
            if conditions:
                query = query.where(and_(*conditions))
            
            # 排序和分页
            query = query.order_by(desc(conversations.c.timestamp)).limit(limit).offset(offset)
            
            # 执行查询
            with self.engine.connect() as conn:
                results = conn.execute(query).fetchall()
            
            # 将结果转换为Conversation对象列表
            return [
                Conversation(
                    id=row.id,
                    model_name=row.model_name,
                    timestamp=row.timestamp,
                    user_input=row.user_input,
                    model_response=row.model_response,
                    metadata=json.loads(row.metadata)
                )
                for row in results
            ]
        except SQLAlchemyError as e:
            print(f"Error getting conversations by time range: {e}")
            raise
    
    def search_conversations(self, keyword: str, limit: int = 20) -> List[Conversation]:
        """搜索对话内容"""
        try:
            # 处理搜索关键词 - 移除潜在的问题字符或使用引号包围
            safe_keyword = keyword
            
            # FTS5 搜索使用原始SQL
            search_sql = text("""
                SELECT c.* FROM conversations c
                JOIN conversations_fts fts ON c.id = fts.id
                WHERE conversations_fts MATCH :keyword
                ORDER BY rank
                LIMIT :limit
            """)
            
            # 执行查询
            with self.engine.connect() as conn:
                results = conn.execute(search_sql, {"keyword": safe_keyword, "limit": limit}).fetchall()
            
            # 将结果转换为Conversation对象列表
            return [
                Conversation(
                    id=row.id,
                    model_name=row.model_name,
                    timestamp=row.timestamp,
                    user_input=row.user_input,
                    model_response=row.model_response,
                    metadata=json.loads(row.metadata)
                )
                for row in results
            ]
        except SQLAlchemyError as e:
            print(f"Error searching conversations: {e}")
            
            # 降级为简单搜索
            try:
                query = select(conversations).where(
                    or_(
                        conversations.c.user_input.like(f"%{keyword}%"),
                        conversations.c.model_response.like(f"%{keyword}%")
                    )
                ).limit(limit)
                
                with self.engine.connect() as conn:
                    results = conn.execute(query).fetchall()
                
                return [
                    Conversation(
                        id=row.id,
                        model_name=row.model_name,
                        timestamp=row.timestamp,
                        user_input=row.user_input,
                        model_response=row.model_response,
                        metadata=json.loads(row.metadata)
                    )
                    for row in results
                ]
            except SQLAlchemyError as e2:
                print(f"Error during fallback search: {e2}")
                return []
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话"""
        try:
            # 构建删除语句
            delete_stmt = conversations.delete().where(conversations.c.id == conversation_id)
            
            # 执行删除
            with self.engine.begin() as conn:
                result = conn.execute(delete_stmt)
                return result.rowcount > 0
        except SQLAlchemyError as e:
            print(f"Error deleting conversation: {e}")
            raise
    
    def get_recent_conversations(self, days: int = 7, limit: int = 50) -> List[Conversation]:
        """获取最近的对话"""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        return self.get_conversations_by_time_range(
            start_time=start_time,
            end_time=end_time,
            limit=limit
        )
    
    def _backup_to_json(self, conversation: Conversation) -> None:
        """备份对话到JSON文件"""
        date_str = conversation.timestamp.strftime("%Y-%m-%d")
        backup_file = self.backup_dir / f"{date_str}.json"
        
        # 将对话转换为字典
        conv_dict = conversation.to_dict()
        
        # 读取现有备份或创建新文件
        if backup_file.exists():
            with open(backup_file, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    data = []
        else:
            data = []
        
        # 添加新对话并保存
        data.append(conv_dict)
        with open(backup_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2) 