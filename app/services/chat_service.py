import os
import logging
import traceback
import asyncio
import threading
from openai import OpenAI
from typing import Dict, List, Optional, Callable, Any

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

    def stream_chat(
        self,
        user_input,
        history_messages=None,
        on_delta: Optional[Callable[[str], None]] = None,
        cancel_event: Optional[threading.Event] = None
    ):
        if history_messages:
            messages = [dict(message) for message in history_messages]
        else:
            messages = []
            if self.system_prompt:
                messages.append(MessageTemplate("system", self.system_prompt).to_dict())
        messages.append(MessageTemplate("user", user_input).to_dict())

        completion = self.create_completion(messages, stream=True)
        content_parts = []
        for chunk in completion:
            if cancel_event and cancel_event.is_set():
                try:
                    completion.close()
                except Exception:
                    pass
                break
            delta = ""
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                delta = chunk.choices[0].delta.content
            if delta:
                content_parts.append(delta)
                if on_delta:
                    on_delta(delta)

        content = "".join(content_parts)
        if content:
            messages.append(MessageTemplate("assistant", content).to_dict())
            self._save_conversation(user_input, content)
        return messages

    def create_completion(self, messages, stream=False):
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
                messages=messages,
                stream=stream
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
        self.cancel_event = threading.Event()

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

    def _put_stream_event(self, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop, event: Dict[str, Any]):
        asyncio.run_coroutine_threadsafe(queue.put(event), loop).result()

    def _stream_single_model(
        self,
        model_name: str,
        chat_client: ChatClient,
        user_input: str,
        history_messages: Optional[List[Dict[str, str]]],
        queue: asyncio.Queue,
        loop: asyncio.AbstractEventLoop,
        cancel_event: threading.Event
    ):
        self._put_stream_event(queue, loop, {"type": "start", "model": model_name})
        try:
            messages = chat_client.stream_chat(
                user_input=user_input,
                history_messages=history_messages,
                cancel_event=cancel_event,
                on_delta=lambda content: self._put_stream_event(
                    queue, loop, {"type": "delta", "model": model_name, "content": content}
                )
            )
            if not cancel_event.is_set():
                self._put_stream_event(
                    queue,
                    loop,
                    {
                        "type": "done",
                        "model": model_name,
                        "message": messages[-1] if messages else None
                    }
                )
        except Exception as e:
            if cancel_event.is_set():
                return
            logger.error(f"ERROR streaming model {model_name}: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            self._put_stream_event(
                queue,
                loop,
                {"type": "error", "model": model_name, "error": str(e)}
            )

    async def stream_chat(self, user_input, history_chat_dict: Optional[Dict[str, List[Dict[str, str]]]] = None):
        queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_running_loop()
        tasks = []

        for model_name, chat_client in self.chat_client_dict.items():
            history_messages = history_chat_dict.get(model_name) if history_chat_dict else None
            tasks.append(
                asyncio.create_task(
                    asyncio.to_thread(
                        self._stream_single_model,
                        model_name,
                        chat_client,
                        user_input,
                        history_messages,
                        queue,
                        loop,
                        self.cancel_event
                    )
                )
            )

        async def wait_all():
            await asyncio.gather(*tasks, return_exceptions=True)
            await queue.put({"type": "complete"})

        asyncio.create_task(wait_all())
        return queue

    def cancel_stream(self):
        self.cancel_event.set()
    
    def search_history(self, keyword: str, limit: int = 20) -> List[Conversation]:
        """搜索历史对话"""
        return self.repository.search_conversations(keyword, limit)
    
    def get_recent_conversations(self, days: int = 7) -> List[Conversation]:
        """获取最近的对话"""
        return self.repository.get_recent_conversations(days)
