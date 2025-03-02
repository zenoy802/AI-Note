from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import os

from ..services.rag_service import RAGService

router = APIRouter()

MODEL_CONFIGS = {
    "qwen": {
        "api_key": os.getenv("DASHSCOPE_API_KEY"),
        "base_url": os.getenv("DASHSCOPE_BASE_URL"),
        "model": "qwen-turbo",
        "system_prompt": "You are a helpful AI assistant."
    },
    "kimi": {
        "api_key": os.getenv("MOONSHOT_API_KEY"),
        "base_url": os.getenv("MOONSHOT_BASE_URL"),
        "model": "moonshot-v1-8k",
        "system_prompt": "You are Kimi, a helpful AI assistant."
    }
}

rag_service = RAGService(model=MODEL_CONFIGS["qwen"]["model"], api_key=MODEL_CONFIGS["qwen"]["api_key"], base_url=MODEL_CONFIGS["qwen"]["base_url"])

class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 3

class IndexRequest(BaseModel):
    days_limit: Optional[int] = None

@router.post("/search")
async def search_conversations(request: SearchRequest):
    """搜索历史对话并生成总结"""
    try:
        results = rag_service.search(request.query, top_k=request.top_k)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/index")
async def index_conversations(request: IndexRequest, background_tasks: BackgroundTasks):
    """将对话索引到向量数据库（异步任务）"""
    try:
        # 在后台运行索引任务
        # background_tasks.add_task(rag_service.index_all_conversations, request.days_limit)
        rag_service.index_all_conversations(request.days_limit)
        return {"status": "indexing started", "message": "对话索引任务已开始，这可能需要一些时间完成"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/index/status")
async def get_index_status():
    """获取索引状态（简单实现）"""
    try:
        # 获取向量数据库集合信息
        collection_info = rag_service.vector_db.collection.count()
        return {
            "status": "active",
            "indexed_chunks": collection_info,
            # "last_updated": "unavailable"  # 在实际实现中需要存储最后更新时间
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 