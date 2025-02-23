import os
import pdb
from openai import OpenAI

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

    def start_chat(self, user_input):
        messages = []
        if self.system_prompt:
            messages.append(MessageTemplate("system", self.system_prompt).to_dict())
        if user_input:
            messages.append(MessageTemplate("user", user_input).to_dict())
        completion = self.create_completion(messages)
        content = completion.choices[0].message.content
        messages.append(MessageTemplate("assistant", content).to_dict())
        return messages
    
    def continue_chat(self, user_input, history_messages):
        if not history_messages:
            return self.start_chat(user_input)
        history_messages.append(MessageTemplate("user", user_input).to_dict())
        completion = self.create_completion(history_messages)
        content = completion.choices[0].message.content
        history_messages.append(MessageTemplate("assistant", content).to_dict())
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

class ChatService:
    
    def __init__(self, chat_client_dict):
        self.chat_client_dict = chat_client_dict

    def start_chat(self, user_input):
        chat_dict = {}
        for chat_client in self.chat_client_dict.values():
            messages = chat_client.start_chat(user_input)
            if messages:
                chat_dict[chat_client.model] = messages
        return chat_dict
    
    def continue_chat(self, user_input, history_chat_dict):
        for chat_client in self.chat_client_dict.values():
            messages = chat_client.continue_chat(user_input, history_chat_dict.get(chat_client.model))
            if messages:
                history_chat_dict[chat_client.model] = messages
        return history_chat_dict
    
    def get_model_response(self, model, chat_dict):
        messages = chat_dict.get(model)
        if messages and messages[-1].get("role") == "assistant":
            return messages[-1].get("content")
        return None