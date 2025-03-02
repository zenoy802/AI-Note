from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from pydantic import BaseModel
import os
from ..services.chat_service import ChatService, ChatClient
import pdb  # 添加这行
from dotenv import load_dotenv
from datetime import datetime, timedelta
from ..models.conversation import Conversation
from ..repositories.conversation_repository import ConversationRepository

# 加载环境变量
load_dotenv()

router = APIRouter()

# 预定义可用的模型配置
MODEL_CONFIGS = {
    "qwen": {
        "api_key": os.getenv("DASHSCOPE_API_KEY"),
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "model": "qwen-turbo",
        "system_prompt": "You are a helpful AI assistant."
    },
    "kimi": {
        "api_key": os.getenv("MOONSHOT_API_KEY"),
        "base_url": "https://api.moonshot.cn/v1",
        "model": "moonshot-v1-8k",
        "system_prompt": "You are Kimi, a helpful AI assistant."
    }
}

# 请求和响应模型
class ChatRequest(BaseModel):
    user_input: str
    model_names: List[str]  # 添加模型名称列表
    history_chat_dict: Optional[Dict[str, List[Dict[str, str]]]] = None

class ChatResponse(BaseModel):
    chat_dict: Dict[str, List[Dict[str, str]]]

@router.post("/start_chat", response_model=ChatResponse)
async def start_chat(request: ChatRequest):
    try:
        # 根据请求的模型名称初始化聊天客户端
        chat_clients = {}
        for model_name in request.model_names:
            if model_name not in MODEL_CONFIGS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported model: {model_name}"
                )
            config = MODEL_CONFIGS[model_name]
            chat_clients[model_name] = ChatClient(
                api_key=config["api_key"],
                base_url=config["base_url"],
                model=config["model"],
                system_prompt=config["system_prompt"]
            )
        
        # 初始化聊天服务
        chat_service = ChatService(chat_clients)
        chat_dict = chat_service.start_chat(request.user_input)
        return ChatResponse(chat_dict=chat_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/continue_chat", response_model=ChatResponse)
async def continue_chat(request: ChatRequest):
    if not request.history_chat_dict:
        return await start_chat(request)
    
    try:
        # 根据历史对话中的模型初始化聊天客户端
        chat_clients = {}
        for model_name in request.model_names:
            if model_name not in MODEL_CONFIGS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported model: {model_name}"
                )
            config = MODEL_CONFIGS[model_name]
            chat_clients[model_name] = ChatClient(
                api_key=config["api_key"],
                base_url=config["base_url"],
                model=config["model"],
                system_prompt=config["system_prompt"]
            )
        
        # 初始化聊天服务
        chat_service = ChatService(chat_clients)
        chat_dict = chat_service.continue_chat(
            request.user_input, 
            request.history_chat_dict
        )
        return ChatResponse(chat_dict=chat_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 添加历史搜索路由
@router.get("/history/search")
async def search_history(keyword: str, limit: int = 20):
    """搜索历史对话记录"""
    try:
        repository = ConversationRepository()
        results = repository.search_conversations(keyword, limit)
        return {
            "results": [conv.to_dict() for conv in results],
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/recent")
async def get_recent_history(days: int = 7, limit: int = 50):
    """获取最近的对话记录"""
    try:
        repository = ConversationRepository()
        results = repository.get_recent_conversations(days, limit)
        return {
            "results": [conv.to_dict() for conv in results],
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{conversation_id}")
async def get_conversation(conversation_id: str):
    """获取单个对话详情"""
    try:
        repository = ConversationRepository()
        conversation = repository.get_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation.to_dict()
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e)) 