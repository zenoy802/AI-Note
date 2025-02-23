from langchain.vectorstores import FAISS
from langchain.embeddings import OpenAIEmbeddings
from langchain.text_splitter import CharacterTextSplitter
from typing import List
from ..models import Message
from sqlalchemy.orm import Session

class SearchService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings()
        self.text_splitter = CharacterTextSplitter(
            separator="\n",
            chunk_size=1000,
            chunk_overlap=200
        )
    
    async def search_conversations(self, db: Session, query: str, 
                                 limit: int = 5) -> List[dict]:
        # 获取所有消息
        messages = db.query(Message).all()
        
        # 准备文档
        docs = []
        for msg in messages:
            docs.append({
                "content": msg.content,
                "metadata": {
                    "conversation_id": msg.conversation_id,
                    "role": msg.role,
                    "created_at": msg.created_at.isoformat()
                }
            })
        
        # 创建向量存储
        vectorstore = FAISS.from_texts(
            [doc["content"] for doc in docs],
            self.embeddings,
            metadatas=[doc["metadata"] for doc in docs]
        )
        
        # 搜索相似内容
        results = vectorstore.similarity_search_with_score(query, k=limit)
        
        return [{
            "content": result[0].page_content,
            "metadata": result[0].metadata,
            "score": result[1]
        } for result in results] 