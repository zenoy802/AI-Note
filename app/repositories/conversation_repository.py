import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy import select, desc, and_, text, or_, func
from sqlalchemy.exc import SQLAlchemyError

from ..models.conversation import Conversation
from ..models.message import Message
from ..utils.db_utils import get_engine, init_db, conversations, messages


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
        """保存对话会话到数据库"""
        try:
            # 准备插入数据
            insert_values = {
                'id': conversation.id,
                'user_id': conversation.user_id,
                'session_title': conversation.session_title,
                'model_name': conversation.model_name,
                'timestamp': conversation.timestamp,
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
            
    def save_message(self, message: Message) -> str:
        """保存消息到数据库"""
        try:
            # 准备插入数据
            insert_values = {
                'id': message.id,
                'conversation_id': message.conversation_id,
                'role': message.role,
                'content': message.content,
                'sequence_id': message.sequence_id,
                'timestamp': message.timestamp,
                'feedback': message.feedback
            }
            
            # 执行插入操作
            with self.engine.begin() as conn:
                conn.execute(messages.insert().values(**insert_values))
            
            return message.id
        except SQLAlchemyError as e:
            print(f"Error saving message: {e}")
            raise
    
    def get_conversation_by_id(self, conversation_id: str) -> Optional[Conversation]:
        """根据ID获取单个对话会话"""
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
                user_id=result.user_id,
                session_title=result.session_title,
                model_name=result.model_name,
                timestamp=result.timestamp,
                metadata=json.loads(result.metadata)
            )
        except SQLAlchemyError as e:
            print(f"Error getting conversation: {e}")
            raise
            
    def get_messages_by_conversation_id(self, conversation_id: str) -> List[Message]:
        """根据会话ID获取所有消息"""
        try:
            # 构建查询
            query = select(messages).where(messages.c.conversation_id == conversation_id).order_by(messages.c.sequence_id)
            
            # 执行查询
            with self.engine.connect() as conn:
                results = conn.execute(query).fetchall()
            
            # 将结果转换为Message对象列表
            return [
                Message(
                    id=row.id,
                    conversation_id=row.conversation_id,
                    role=row.role,
                    content=row.content,
                    sequence_id=row.sequence_id,
                    timestamp=row.timestamp,
                    feedback=row.feedback
                )
                for row in results
            ]
        except SQLAlchemyError as e:
            print(f"Error getting messages: {e}")
            raise

    def get_messages_by_title(self, title: str) -> Dict[str, List[Message]]:
        """根据会话标题获取所有消息，按模型名称分组并返回每个模型最近一次对话的消息
        
        Args:
            title: 会话标题（模糊匹配）
            
        Returns:
            以模型名称为键，消息列表为值的字典
        """
        try:
            # 构建模糊匹配条件
            title_pattern = f"%{title}%"
            
            # 查找所有匹配标题的会话
            query = select(conversations).where(conversations.c.session_title.like(title_pattern))
            
            # 执行查询
            with self.engine.connect() as conn:
                conversation_results = conn.execute(query).fetchall()
            
            if not conversation_results:
                return {}
            
            # 按模型名称分组，获取每个模型最新的会话
            model_latest_conversations = {}
            for row in conversation_results:
                model_name = row.model_name
                if model_name not in model_latest_conversations or row.timestamp > model_latest_conversations[model_name]["timestamp"]:
                    model_latest_conversations[model_name] = {
                        "id": row.id,
                        "timestamp": row.timestamp
                    }
            
            # 获取每个最新会话的消息
            result_dict = {}
            for model_name, conv_info in model_latest_conversations.items():
                messages_list = self.get_messages_by_conversation_id(conv_info["id"])
                result_dict[model_name] = messages_list
            
            return result_dict
        except SQLAlchemyError as e:
            print(f"Error getting messages by title: {e}")
            return {}
        
    
    def get_conversations_by_time_range(
        self, 
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Conversation]:
        """按时间范围获取对话会话列表"""
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
                    user_id=row.user_id,
                    session_title=row.session_title,
                    model_name=row.model_name,
                    timestamp=row.timestamp,
                    metadata=json.loads(row.metadata)
                )
                for row in results
            ]
        except SQLAlchemyError as e:
            print(f"Error getting conversations by time range: {e}")
            raise
    
    def search_messages(self, keyword: str, limit: int = 20, context_chars: int = 100) -> List[Dict[str, Any]]:
        """搜索消息内容，返回匹配的会话信息和匹配文本的上下文
        
        Args:
            keyword: 搜索关键词
            limit: 最大返回结果数
            context_chars: 关键词前后的上下文字符数
            
        Returns:
            包含会话信息和匹配文本上下文的字典列表，同一个对话的不同消息会合并到一条记录中
        """
        try:
            # 处理搜索关键词 - 移除潜在的问题字符或使用引号包围
            safe_keyword = keyword
            
            # FTS5 搜索使用原始SQL
            search_sql = text("""
                SELECT  c.*
                        ,m.id AS messages_id
                        ,m.conversation_id
                        ,m.role
                        ,m.content
                        ,m.sequence_id
                        ,m.timestamp AS messages_timestamp
                        ,m.feedback
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                JOIN messages_fts fts ON m.rowid = fts.rowid
                WHERE messages_fts MATCH :keyword
                ORDER BY c.timestamp DESC
                LIMIT :limit
            """)
            
            # 执行查询
            with self.engine.connect() as conn:
                results = conn.execute(search_sql, {"keyword": safe_keyword, "limit": limit}).fetchall()
        
        except SQLAlchemyError as e:
            print(f"Error searching messages: {e}")
            results = []
        
        if not results:
            # 降级为简单搜索
            print(f"Fallback to simple search for keyword: {keyword}")
            try:
                query = select(
                    messages.c.id,
                    messages.c.conversation_id,
                    messages.c.role,
                    messages.c.content,
                    messages.c.timestamp.label('messages_timestamp'),
                    conversations.c.session_title,
                    conversations.c.model_name,
                    conversations.c.timestamp
                ).select_from(
                    messages.join(conversations, messages.c.conversation_id == conversations.c.id)
                ).where(
                    messages.c.content.like(f"%{keyword}%")
                ).limit(limit)
                
                with self.engine.connect() as conn:
                    results = conn.execute(query).fetchall()
            
            except SQLAlchemyError as e2:
                print(f"Error during fallback search: {e2}")
            
            # 使用字典来跟踪已处理的对话ID，实现去重和合并
            conversation_dict = {}
            
            for row in results:
                # 提取关键词上下文
                content = row.content
                keyword_pos = content.lower().find(keyword.lower())
                
                if keyword_pos >= 0:
                    # 计算上下文的起始和结束位置
                    start_pos = max(0, keyword_pos - context_chars)
                    end_pos = min(len(content), keyword_pos + len(keyword) + context_chars)
                    
                    # 提取上下文
                    context_text = content[start_pos:end_pos]
                    
                    # 如果上下文不是从文本开头开始，添加省略号
                    if start_pos > 0:
                        context_text = "..." + context_text
                    
                    # 如果上下文不是到文本结尾结束，添加省略号
                    if end_pos < len(content):
                        context_text = context_text + "..."
                    
                    # 构建匹配上下文对象
                    match_context = {
                        "role": row.role,
                        "text": context_text,
                        "timestamp": row.messages_timestamp.isoformat() if isinstance(row.messages_timestamp, datetime) else row.messages_timestamp
                    }
                    
                    # 检查该对话是否已在结果集中
                    if row.id in conversation_dict:
                        # 如果已存在，将匹配上下文添加到该对话的匹配列表中
                        conversation_dict[row.id]["match_contexts"].append(match_context)
                    else:
                        # 如果不存在，创建新的对话记录
                        conversation_dict[row.id] = {
                            "conversation": {
                                "id": row.id,
                                "session_title": row.session_title,
                                "model_name": row.model_name,
                                "timestamp": row.timestamp.isoformat() if isinstance(row.timestamp, datetime) else row.timestamp,
                            },
                            "match_contexts": [match_context]
                        }
            
            # 将字典转换为列表返回
            result_list = list(conversation_dict.values())
            
            return result_list
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话会话及其关联的所有消息"""
        try:
            # 先删除关联的消息
            delete_messages_stmt = messages.delete().where(messages.c.conversation_id == conversation_id)
            
            # 再删除会话
            delete_conv_stmt = conversations.delete().where(conversations.c.id == conversation_id)
            
            # 在一个事务中执行两个删除操作
            with self.engine.begin() as conn:
                conn.execute(delete_messages_stmt)
                result = conn.execute(delete_conv_stmt)
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
    
    def get_conversations_by_model(self, model_name: str, limit: int = 50, offset: int = 0) -> List[Conversation]:
        """根据模型名称获取对话会话列表"""
        try:
            # 构建查询
            query = select(conversations).where(conversations.c.model_name == model_name)
            
            # 排序和分页
            query = query.order_by(desc(conversations.c.timestamp)).limit(limit).offset(offset)
            
            # 执行查询
            with self.engine.connect() as conn:
                results = conn.execute(query).fetchall()
            
            # 将结果转换为Conversation对象列表
            return [
                Conversation(
                    id=row.id,
                    user_id=row.user_id,
                    session_title=row.session_title,
                    model_name=row.model_name,
                    timestamp=row.timestamp,
                    metadata=json.loads(row.metadata)
                )
                for row in results
            ]
        except SQLAlchemyError as e:
            print(f"Error getting conversations by model: {e}")
            raise
    
    def _backup_to_json(self, conversation: Conversation) -> None:
        """备份对话会话到JSON文件"""
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