import tiktoken
from typing import List, Dict, Any
import re

class TextSplitter:
    """文本分块器，用于将长文本分割成适合向量化的小块"""
    
    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        # 加载tokenizer
        self.tokenizer = tiktoken.get_encoding("cl100k_base")  # OpenAI 模型使用的编码
    
    def split_text(self, text: str) -> List[str]:
        """将文本按token数量分块"""
        tokens = self.tokenizer.encode(text)
        chunks = []
        
        i = 0
        while i < len(tokens):
            # 提取当前块的token
            chunk_end = min(i + self.chunk_size, len(tokens))
            chunk_tokens = tokens[i:chunk_end]
            chunks.append(self.tokenizer.decode(chunk_tokens))
            
            # 移动到下一个块的起始位置，考虑重叠
            i += self.chunk_size - self.chunk_overlap
            if i >= len(tokens):
                break
        
        return chunks
    
    def split_conversation(self, conversation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """将对话拆分为多个块，保留元数据"""
        combined_text = (
            f"用户: {conversation['user_input']}\n"
            f"模型({conversation['model_name']}): {conversation['model_response']}"
        )
        
        text_chunks = self.split_text(combined_text)
        chunks = []
        
        for i, chunk in enumerate(text_chunks):
            chunks.append({
                "id": f"{conversation['id']}_chunk_{i}",
                "parent_id": conversation['id'],
                "model_name": conversation['model_name'],
                "timestamp": conversation['timestamp'],
                "text": chunk,
                "metadata": {
                    **conversation.get('metadata', {}),
                    "chunk_index": i,
                    "total_chunks": len(text_chunks)
                }
            })
        
        return chunks 