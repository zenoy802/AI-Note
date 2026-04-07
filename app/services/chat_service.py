import os
import logging
import traceback
from openai import OpenAI
from typing import Dict, List, Optional

from ..models.conversation import Conversation
from ..repositories.conversation_repository import ConversationRepository

logger = logging.getLogger(__name__)


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

class ChatClient:
    
    def __init__(self, api_key, base_url, model, system_prompt=None):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.system_prompt = system_prompt
        self.repository = ConversationRepository()

    def start_chat(self, user_input):
        logger.info(f"ChatClient.start_chat called, model={self.model}, user_input={user_input}")
        messages = []
        if self.system_prompt:
            messages.append(MessageTemplate("system", self.system_prompt).to_dict())
        if user_input:
            messages.append(MessageTemplate("user", user_input).to_dict())
        logger.info(f"Calling create_completion with {len(messages)} messages")
        completion = self.create_completion(messages)
        content = completion.choices[0].message.content
        logger.info(f"Got response from model, content length={len(content)}")
        messages.append(MessageTemplate("assistant", content).to_dict())

        # 存储对话记录
        logger.info("Saving conversation to repository...")
        self._save_conversation(user_input, content)
        logger.info("Conversation saved successfully")

        return messages
    
    def continue_chat(self, user_input, history_messages):
        if not history_messages:
            return self.start_chat(user_input)
        history_messages.append(MessageTemplate("user", user_input).to_dict())
        completion = self.create_completion(history_messages)
        content = completion.choices[0].message.content
        history_messages.append(MessageTemplate("assistant", content).to_dict())
        
        # 存储对话记录
        self._save_conversation(user_input, content)
        
        return history_messages

    def create_completion(self, messages):
        logger.info(f"create_completion called, model={self.model}, base_url={self.base_url}")
        logger.info(f"api_key is {'***' if self.api_key else 'MISSING'}")
        try:
            client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url
            )
            logger.info("OpenAI client created, calling API...")
            completion = client.chat.completions.create(
                model=self.model,
                messages=messages
            )
            logger.info("API call successful")
            return completion
        except Exception as e:
            logger.error(f"ERROR in create_completion: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    def _save_conversation(self, user_input: str, model_response: str) -> None:
        """保存对话到存储库"""
        logger.info(f"_save_conversation called, model={self.model}")
        try:
            conversation = Conversation(
                model_name=self.model,
                user_input=user_input,
                model_response=model_response,
                metadata={
                    "system_prompt": self.system_prompt
                }
            )
            self.repository.save_conversation(conversation)
            logger.info("Conversation saved successfully")
        except Exception as e:
            logger.error(f"ERROR saving conversation: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

class ChatService:

    def __init__(self, chat_client_dict):
        self.chat_client_dict = chat_client_dict
        self.repository = ConversationRepository()

    def start_chat(self, user_input):
        logger.info(f"ChatService.start_chat called, user_input={user_input}")
        logger.info(f"Available models in chat_client_dict: {list(self.chat_client_dict.keys())}")
        chat_dict = {}
        for model_name, chat_client in self.chat_client_dict.items():
            try:
                logger.info(f"Calling start_chat for model: {model_name}")
                messages = chat_client.start_chat(user_input)
                if messages:
                    chat_dict[model_name] = messages
                    logger.info(f"Successfully got response for model: {model_name}, messages count={len(messages)}")
            except Exception as e:
                logger.error(f"ERROR processing model {model_name}: {str(e)}")
                raise
        logger.info(f"start_chat completed, returning chat_dict with keys: {chat_dict.keys()}")
        return chat_dict

    def continue_chat(self, user_input, history_chat_dict):
        for model_name, chat_client in self.chat_client_dict.items():
            messages = chat_client.continue_chat(user_input, history_chat_dict.get(model_name))
            if messages:
                history_chat_dict[model_name] = messages
        return history_chat_dict
    
    def search_history(self, keyword: str, limit: int = 20) -> List[Conversation]:
        """搜索历史对话"""
        return self.repository.search_conversations(keyword, limit)
    
    def get_recent_conversations(self, days: int = 7) -> List[Conversation]:
        """获取最近的对话"""
        return self.repository.get_recent_conversations(days)