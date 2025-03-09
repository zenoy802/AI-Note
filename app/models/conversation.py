import uuid
from datetime import datetime
import json
from pydantic import BaseModel, Field


class Conversation(BaseModel):
    """对话数据模型，存储单轮对话信息"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    model_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_input: str
    model_response: str
    metadata: dict = Field(default_factory=dict)
    
    def to_dict(self):
        """转换为字典格式"""
        # 构建聊天历史记录
        chat_history = [
            {"role": "user", "content": self.user_input},
            {"role": "assistant", "content": self.model_response}
        ]
        
        return {
            "id": self.id,
            "model_name": self.model_name,
            "timestamp": self.timestamp.isoformat(),
            "user_input": self.user_input,
            "model_response": self.model_response,
            "metadata": self.metadata,
            "chat_history": chat_history
        }
    
    @classmethod
    def from_dict(cls, data):
        """从字典创建实例"""
        if isinstance(data["timestamp"], str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**data)