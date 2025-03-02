import os
from typing import List, Dict, Any, Optional
import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from chromadb.utils import embedding_functions
from chromadb.errors import InvalidCollectionException
from openai import OpenAI
import json
import time
from datetime import datetime
from pathlib import Path
import dashscope
import json
from http import HTTPStatus

from ..utils.text_splitter import TextSplitter

from dotenv import load_dotenv

load_dotenv()

class DashScopeEmbeddingFunction(EmbeddingFunction):

    def __init__(self, model: str = "multimodal-embedding-v1", dimension: int = 1024, batch_size: int = 10):
        # 本应通过OpenAI SDK有统一开发标准，但embedding模型各厂商开放的不多，且都没有适配OpenAI SDK
        self.client = dashscope.MultiModalEmbedding
        self.model = model
        self.dimension = dimension  # multimodal-embedding-v1的维度
        self.batch_size = batch_size

    def __call__(self, input: Documents) -> Embeddings:
        """
        将输入文本转换为嵌入向量
        参数:
            input: 要嵌入的文本列表
        返回:
            生成的嵌入向量列表
        """
        embeddings = []
        batch_size = self.batch_size
        
        # 批处理以避免API限制
        for i in range(0, len(input), batch_size):
            batch_texts = []
            for j in range(i, min(i + batch_size, len(input))):
                batch_texts.append({'text': input[j]})
            
            try:
                resp = dashscope.MultiModalEmbedding.call(
                    model=self.model,
                    input=batch_texts
                )
                if resp.status_code == HTTPStatus.OK:
                    batch_embeddings = [item["embedding"] for item in resp.output["embeddings"]]
                    embeddings.extend(batch_embeddings)
                else:
                    print(f"Error calling embeddings api: {resp.code}, {resp.message}")
                    # 出错时填充零向量
                    zero_embeddings = [[0.0] * self.dimension] * len(batch_texts)
                    embeddings.extend(zero_embeddings)
                
                # 避免触发API速率限制
                if i + batch_size < len(input):
                    time.sleep(0.5)
                    
            except Exception as e:
                print(f"Error creating embeddings for batch {i}: {e}")
                # 出错时填充零向量
                zero_embeddings = [[0.0] * self.dimension] * len(batch_texts)
                embeddings.extend(zero_embeddings)
        
        return embeddings 


class VectorDBService:
    """向量数据库服务，管理对话的向量存储和检索"""
    
    def __init__(self, collection_name: str = "conversation_chunks"):
        # 确保向量数据库目录存在
        db_dir = Path("data/vectordb")
        db_dir.mkdir(exist_ok=True, parents=True)
        
        # 初始化ChromaDB客户端
        self.client = chromadb.PersistentClient(path=str(db_dir))
        
        # 使用自定义的embedding函数
        self.embedding_function = self._create_embedding_function()
        
        # 创建或获取集合
        try:
            self.collection = self.client.get_collection(
                name=collection_name,
                embedding_function=self.embedding_function
            )
        except InvalidCollectionException:
            self.collection = self.client.create_collection(
                name=collection_name,
                embedding_function=self.embedding_function
            )
        except Exception as e:
            raise e
        
        # 初始化文本分块器
        self.text_splitter = TextSplitter()
    
    def _create_embedding_function(self):
        """创建自定义embedding函数集成OpenAI"""
        return DashScopeEmbeddingFunction()
    
    def add_conversation(self, conversation: Dict[str, Any]) -> List[str]:
        """添加一个对话到向量数据库，返回添加的chunk ID列表"""
        # 将对话分块
        chunks = self.text_splitter.split_conversation(conversation)
        
        # 准备添加到ChromaDB的数据
        ids = [chunk["id"] for chunk in chunks]
        texts = [chunk["text"] for chunk in chunks]
        metadatas = [
            {
                "parent_id": chunk["parent_id"],
                "model_name": chunk["model_name"],
                "timestamp": chunk["timestamp"].isoformat() if isinstance(chunk["timestamp"], datetime) else chunk["timestamp"],
                "metadata": json.dumps(chunk["metadata"])
            }
            for chunk in chunks
        ]
        
        # 添加到集合
        self.collection.add(
            ids=ids,
            documents=texts,
            metadatas=metadatas
        )
        
        return ids
    
    def query(self, query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """根据查询文本检索相关的对话片段"""
        results = self.collection.query(
            query_texts=[query_text],
            n_results=top_k
        )
        
        documents = results["documents"][0]
        metadatas = results["metadatas"][0]
        ids = results["ids"][0]
        distances = results.get("distances", [[0] * len(ids)])[0]
        
        return [
            {
                "id": ids[i],
                "text": documents[i],
                "metadata": {
                    "parent_id": metadatas[i]["parent_id"],
                    "model_name": metadatas[i]["model_name"],
                    "timestamp": metadatas[i]["timestamp"],
                    "metadata": json.loads(metadatas[i]["metadata"]) if isinstance(metadatas[i]["metadata"], str) else metadatas[i]["metadata"]
                },
                "relevance_score": 1 - (distances[i] / 2)  # 转换距离为相关性分数
            }
            for i in range(len(documents))
        ]
    
    def add_conversations_batch(self, conversations: List[Dict[str, Any]]) -> int:
        """批量添加多个对话，返回添加的chunk总数"""
        all_ids = []
        
        for conversation in conversations:
            try:
                chunk_ids = self.add_conversation(conversation)
                all_ids.extend(chunk_ids)
            except Exception as e:
                print(f"Error adding conversation {conversation.get('id', 'unknown')}: {e}")
        
        return len(all_ids) 