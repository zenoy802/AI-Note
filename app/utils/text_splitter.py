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
    
    def split_conversation(self, conversation: Dict[str, Any], messages: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """将对话拆分为多个块，保留元数据
        
        Args:
            conversation: 对话会话字典
            messages: 消息列表字典，如果为None则尝试从conversation中获取user_input和model_response
        """
        if messages and len(messages) >= 2:
            # 新结构：使用消息列表
            user_messages = [msg for msg in messages if msg.get('role') == 'user']
            assistant_messages = [msg for msg in messages if msg.get('role') == 'assistant']
            
            if user_messages and assistant_messages:
                # 组合所有消息而不仅仅是第一条
                combined_text = ""
                
                # 按照消息顺序交替添加用户和助手消息
                # 假设消息是按时间顺序排列的
                all_messages = sorted(
                    user_messages + assistant_messages,
                    key=lambda x: x.get('timestamp', 0)  # 按时间戳排序，如果没有则默认为0
                )
                
                for msg in all_messages:
                    if msg.get('role') == 'user':
                        combined_text += f"用户: {msg['content']}\n"
                    elif msg.get('role') == 'assistant':
                        combined_text += f"模型({conversation['model_name']}): {msg['content']}\n"
                
                # 移除最后一个换行符
                combined_text = combined_text.rstrip()
            else:
                # 如果没有足够的消息，返回空列表
                return []
        else:
            # 如果没有足够的数据，返回空列表
            return []
        
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