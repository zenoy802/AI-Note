import uuid
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class Message(BaseModel):
    """消息数据模型，存储单条消息信息"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    role: Literal["user", "assistant", "system"]
    content: str
    sequence_id: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    feedback: Optional[Literal["like", "dislike"]] = None
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "role": self.role,
            "content": self.content,
            "sequence_id": self.sequence_id,
            "timestamp": self.timestamp.isoformat(),
            "feedback": self.feedback
        }
    
    @classmethod
    def from_dict(cls, data):
        """从字典创建实例"""
        if isinstance(data["timestamp"], str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**data)