import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_random_exponential
import json

from ..services.vector_db_service import VectorDBService
from ..repositories.conversation_repository import ConversationRepository

load_dotenv()

SEARCH_SYSTEM_PROMPT = """你是一个专业的对话分析助手，请根据提供的历史对话片段回答用户的问题。
如果历史对话片段中包含相关信息，请基于这些信息提供简明的总结。
如果历史对话片段中没有相关信息，请清晰地说明没有找到相关内容。
请注意，你只能根据提供的对话片段回答，不要添加未在对话片段中提及的信息。
回答需要使用中文，并保持简洁，总结不要超过3句话。"""

class RAGService:
    """检索增强生成服务，结合向量搜索和LLM生成"""
    
    def __init__(self, model: str, api_key: str, base_url: str):
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        
        self.vector_db = VectorDBService()
        self.conversation_repo = ConversationRepository()
    
    def index_all_conversations(self, days_limit: int = None) -> int:
        """索引所有对话（可选限制天数）"""
        if days_limit:
            conversations = self.conversation_repo.get_recent_conversations(days=days_limit)
        else:
            # 获取所有对话，可能需要分页处理大量数据
            conversations = self.conversation_repo.get_conversations_by_time_range()
        
        # 转换为字典列表
        conversation_dicts = [conv.to_dict() for conv in conversations]
        
        # 批量添加到向量数据库
        return self.vector_db.add_conversations_batch(conversation_dicts)
    
    @retry(wait=wait_random_exponential(min=1, max=60), stop=stop_after_attempt(5))
    def generate_summary(self, query: str, context: str) -> str:
        """使用LLM生成对查询的总结"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SEARCH_SYSTEM_PROMPT},
                    {"role": "user", "content": f"查询: {query}\n\n历史对话片段:\n{context}"}
                ],
                temperature=0.3,  # 较低的温度以获得更确定性的回答
                max_tokens=300   # 限制回答长度
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Error generating summary: {e}")
            return f"生成总结时出错: {str(e)}"
    
    def search(self, query: str, top_k: int = 3) -> Dict[str, Any]:
        """执行RAG搜索流程"""
        # 1. 检索相关对话片段
        results = self.vector_db.query(query, top_k=top_k)
        
        if not results:
            return {
                "query": query,
                "summary": "未找到相关的历史对话。",
                "results": []
            }
        
        # 2. 构建上下文
        context = "\n\n".join([
            f"片段 {i+1}:\n{result['text']}"
            for i, result in enumerate(results)
        ])
        
        # 3. 生成总结
        summary = self.generate_summary(query, context)
        
        # 4. 返回结果
        return {
            "query": query,
            "summary": summary,
            "results": results
        } 