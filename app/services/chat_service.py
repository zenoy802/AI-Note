import os
import pdb
from openai import OpenAI
from typing import Dict, List, Optional, Tuple

from ..models.conversation import Conversation
from ..models.message import Message
from ..repositories.conversation_repository import ConversationRepository


class MessageTemplate:
    
    def __init__(self, role: str, content: str):
        self.role = role
        self.content = content
        
    def to_dict(self):
        return {
            "role": self.role,
            "content": self.content
        }
    
    @classmethod
    def from_dict(cls, data):
        return cls(
            role=data.get("role"),
            content=data.get("content")
        )

    @classmethod
    def from_Message(cls, message: Message):
        return cls(
            role=message.role,
            content=message.content
        )

class ChatClient:
    
    def __init__(self, api_key, base_url, model, system_prompt=None):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.system_prompt = system_prompt
        self.repository = ConversationRepository()

    def start_chat(self, user_input):
        messages = []
        if self.system_prompt:
            messages.append(MessageTemplate("system", self.system_prompt).to_dict())
        if user_input:
            messages.append(MessageTemplate("user", user_input).to_dict())
        completion = self.create_completion(messages)
        content = completion.choices[0].message.content
        messages.append(MessageTemplate("assistant", content).to_dict())
        
        # 存储对话记录
        title = self.generate_conversation_title(user_input)
        conversation_id = self._save_conversation(user_input, title)

        # 存储消息
        self._save_message(conversation_id, user_input, content, 1)
        
        return messages
    
    def continue_chat(self, user_input, conversation_id):
        stored_history_messages = self.repository.get_messages_by_conversation_id(conversation_id)
        if not stored_history_messages:
            return self.start_chat(user_input)
        sequence_id = len(stored_history_messages) + 1
        history_messages = []
        for item in stored_history_messages:
            history_messages.append(MessageTemplate.from_Message(item).to_dict())
        history_messages.append(MessageTemplate("user", user_input).to_dict())
        completion = self.create_completion(history_messages)
        content = completion.choices[0].message.content
        history_messages.append(MessageTemplate("assistant", content).to_dict())
        
        # 存储对话记录
        self._save_message(conversation_id, user_input, content, sequence_id)
        
        return history_messages

    def create_completion(self, messages):
        client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )
        completion = client.chat.completions.create(
            model=self.model,
            messages=messages
        )
        return completion

    def generate_conversation_title(self, user_input: str) -> str:
        """根据用户输入生成对话标题"""
        # 这里可以使用更复杂的逻辑，如使用自然语言处理模型生成标题
        # 这里只是一个简单的示例，只取前10个字符作为标题
        return user_input[:10] + "..." if len(user_input) > 10 else user_input
    
    def _save_conversation(self, user_input: str, title: str) -> str:
        """保存对话到存储库"""
        # 创建新会话
        conversation = Conversation(
            model_name=self.model,
            session_title=title if title is not None else "新会话",  # 可以从第一条消息生成标题
            metadata={
                "system_prompt": self.system_prompt
            }
        )
        conversation_id = self.repository.save_conversation(conversation)
        return conversation_id
    
    def _save_message(self, conversation_id: str, user_input: str, model_response: str, sequence_id: int) -> None:
        """保存消息到存储库"""
        # 保存用户消息
        user_message = Message(
            conversation_id=conversation_id,
            role="user",
            content=user_input,
            sequence_id=sequence_id
        )
        self.repository.save_message(user_message)
        sequence_id += 1
        
        # 保存助手消息
        assistant_message = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=model_response,
            sequence_id=sequence_id
        )
        self.repository.save_message(assistant_message)

class ChatService:
    
    def __init__(self, chat_client_dict):
        self.chat_client_dict = chat_client_dict

    def start_chat(self, user_input_dict):
        chat_dict = {}
        for model_name, chat_client in self.chat_client_dict.items():
            messages = chat_client.start_chat(user_input_dict[model_name])
            if messages:
                chat_dict[model_name] = messages
        return chat_dict
    
    def continue_chat(self, user_input_dict, history_chat_dict):
        chat_dict = {}
        for model_name, chat_client in self.chat_client_dict.items():
            messages = chat_client.continue_chat(user_input_dict[model_name], history_chat_dict.get(model_name))
            if messages:
                chat_dict[model_name] = messages
        return chat_dict