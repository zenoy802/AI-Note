import pytest
import os
import uuid
from pathlib import Path
from datetime import datetime, timedelta
import json
import shutil
from unittest.mock import MagicMock, patch

from ..models.conversation import Conversation
from ..models.message import Message
from ..services.vector_db_service import VectorDBService, DashScopeEmbeddingFunction
from ..services.rag_service import RAGService
from ..utils.text_splitter import TextSplitter
from ..repositories.conversation_repository import ConversationRepository

# Setup fixtures
@pytest.fixture
def sample_conversation():
    """提供测试用例"""
    # 创建会话
    conversation = Conversation(
        model_name="test-model",
        session_title="测试会话",
        timestamp=datetime.now(),
        metadata={"context": "programming"}
    )
    
    # 创建用户消息
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content="这是一个测试问题，关于Python的面向对象编程",
        sequence_id=1,
        timestamp=conversation.timestamp
    )
    
    # 创建模型响应消息
    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content="Python的面向对象编程涉及类、对象、继承、多态和封装等概念。",
        sequence_id=2,
        timestamp=conversation.timestamp
    )
    
    # 返回会话和消息
    return {
        "conversation": conversation,
        "messages": [user_message, assistant_message]
    }

@pytest.fixture
def multiple_conversations():
    """提供多个测试用例"""
    conversations_data = [
        {
            "conversation": Conversation(
                model_name="test-model",
                session_title="Python装饰器",
                timestamp=datetime.now() - timedelta(days=1),
                metadata={"context": "programming"}
            ),
            "messages": [
                Message(
                    conversation_id="temp_id",  # 临时ID，将在后面更新
                    role="user",
                    content="什么是Python装饰器?",
                    sequence_id=1,
                    timestamp=datetime.now() - timedelta(days=1)
                ),
                Message(
                    conversation_id="temp_id",  # 临时ID，将在后面更新
                    role="assistant",
                    content="装饰器是Python中用于修改函数或类行为的函数，它们允许你在不修改原函数代码的情况下扩展功能。",
                    sequence_id=2,
                    timestamp=datetime.now() - timedelta(days=1)
                )
            ]
        },
        {
            "conversation": Conversation(
                model_name="test-model",
                session_title="Pandas数据结构",
                timestamp=datetime.now() - timedelta(days=2),
                metadata={"context": "data science"}
            ),
            "messages": [
                Message(
                    conversation_id="temp_id",  # 临时ID，将在后面更新
                    role="user",
                    content="解释一下pandas库的主要数据结构",
                    sequence_id=1,
                    timestamp=datetime.now() - timedelta(days=2)
                ),
                Message(
                    conversation_id="temp_id",  # 临时ID，将在后面更新
                    role="assistant",
                    content="pandas的两个主要数据结构是Series（一维）和DataFrame（二维表格），它们提供了强大的数据分析功能。",
                    sequence_id=2,
                    timestamp=datetime.now() - timedelta(days=2)
                )
            ]
        },
        {
            "conversation": Conversation(
                model_name="test-model",
                session_title="JSON处理",
                timestamp=datetime.now() - timedelta(days=3),
                metadata={"context": "data processing"}
            ),
            "messages": [
                Message(
                    conversation_id="temp_id",  # 临时ID，将在后面更新
                    role="user",
                    content="如何在Python中处理JSON数据?",
                    sequence_id=1,
                    timestamp=datetime.now() - timedelta(days=3)
                ),
                Message(
                    conversation_id="temp_id",  # 临时ID，将在后面更新
                    role="assistant",
                    content="Python可以使用内置的json模块处理JSON数据，主要函数有json.loads()用于解析JSON字符串，json.dumps()用于生成JSON字符串。",
                    sequence_id=2,
                    timestamp=datetime.now() - timedelta(days=3)
                )
            ]
        }
    ]
    
    # 设置消息的conversation_id
    for conv_data in conversations_data:
        conv_id = conv_data["conversation"].id
        for message in conv_data["messages"]:
            message.conversation_id = conv_id
    
    return conversations_data

@pytest.fixture
def text_splitter():
    """文本分块器实例"""
    return TextSplitter(chunk_size=100, chunk_overlap=20)

@pytest.fixture
def mock_embedding_function():
    """模拟的embedding函数，避免API调用"""
    mock_func = MagicMock()
    # 确保函数能接受input参数并返回合适的格式
    mock_func.__call__ = lambda self, input: [[0.1] * 1024 for _ in range(len(input))]
    return mock_func.__call__

@pytest.fixture
def vector_db(tmp_path, mock_embedding_function):
    """创建一个临时的向量数据库"""
    with patch.object(DashScopeEmbeddingFunction, '__call__', mock_embedding_function):
        # 使用临时目录
        db_dir = tmp_path / "test_vectordb"
        db_dir.mkdir(exist_ok=True)
        
        # 创建并返回VectorDBService实例
        service = VectorDBService(collection_name="test_collection")
        return service

@pytest.fixture
def mock_rag_service(vector_db):
    """模拟RAG服务，避免LLM API调用"""
    # 创建RAG服务
    service = RAGService(
        model="test-model",
        api_key="test-api-key",
        base_url="https://test.api/v1"
    )
    
    # 注入模拟的vector_db
    service.vector_db = vector_db
    
    # 模拟OpenAI客户端
    mock_completion = MagicMock()
    mock_completion.choices = [MagicMock()]
    mock_completion.choices[0].message.content = "这是一个测试总结。"
    
    # 模拟chat.completions.create方法
    service.client = MagicMock()
    service.client.chat = MagicMock()
    service.client.chat.completions = MagicMock()
    service.client.chat.completions.create = MagicMock(return_value=mock_completion)
    
    return service

# 测试类
class TestTextSplitter:
    """测试文本分块功能"""
    
    def test_split_text(self, text_splitter):
        """测试文本分块"""
        # 创建一个长文本
        long_text = "这是一段用于测试的长文本。" * 20
        
        # 分块
        chunks = text_splitter.split_text(long_text)
        
        # 验证
        assert len(chunks) > 1, "长文本应该被分成多个块"
        assert all(isinstance(chunk, str) for chunk in chunks), "所有块应该是字符串"
    
    def test_split_conversation(self, text_splitter, sample_conversation):
        """测试对话分块"""
        # 准备对话数据
        conv = sample_conversation["conversation"]
        messages = sample_conversation["messages"]
        
        # 转换为字典格式
        conv_dict = conv.to_dict()
        message_dicts = [msg.to_dict() for msg in messages]
        
        # 分块
        chunks = text_splitter.split_conversation(conv_dict, message_dicts)
        
        # 验证
        assert len(chunks) >= 1, "对话应该至少生成一个块"
        assert all(isinstance(chunk, dict) for chunk in chunks), "所有块应该是字典"
        assert all("parent_id" in chunk for chunk in chunks), "每个块应该包含parent_id"
        assert all(chunk["parent_id"] == conv.id for chunk in chunks), "所有块的parent_id应该指向原始对话"


class TestVectorDB:
    """测试向量数据库功能"""
    
    def test_add_conversation(self, vector_db, sample_conversation):
        """测试添加对话到向量数据库"""
        # 准备对话数据
        conv = sample_conversation["conversation"]
        messages = sample_conversation["messages"]
        
        # 转换为字典格式
        conv_dict = conv.to_dict()
        message_dicts = [msg.to_dict() for msg in messages]
        
        # 添加到向量数据库
        ids = vector_db.add_conversation(conv_dict, message_dicts)
        
        # 验证
        assert len(ids) >= 1, "应该至少添加了一个块"
        
        # 验证集合中的文档数量
        count = vector_db.collection.count()
        assert count >= len(ids), f"集合中应该至少有 {len(ids)} 个文档，实际有 {count} 个"
    
    def test_query(self, vector_db, sample_conversation, multiple_conversations):
        """测试查询向量数据库"""
        # 准备对话数据
        conv = sample_conversation["conversation"]
        messages = sample_conversation["messages"]
        
        # 转换为字典格式
        conv_dict = conv.to_dict()
        message_dicts = [msg.to_dict() for msg in messages]
        
        # 添加到向量数据库
        vector_db.add_conversation(conv_dict, message_dicts)
        
        # 添加多个对话
        for conv_data in multiple_conversations:
            conv_dict = conv_data["conversation"].to_dict()
            message_dicts = [msg.to_dict() for msg in conv_data["messages"]]
            vector_db.add_conversation(conv_dict, message_dicts)
        
        # 查询
        results = vector_db.query("Python", top_k=2)
        
        # 验证
        assert len(results) <= 2, f"应该最多返回2个结果，实际返回了 {len(results)} 个"
        assert all("text" in result for result in results), "每个结果应该包含文本字段"
        assert all("metadata" in result for result in results), "每个结果应该包含元数据字段"


class TestRAGService:
    """测试RAG服务功能"""
    
    def test_index_all_conversations(self, mock_rag_service, multiple_conversations):
        """测试索引所有对话"""
        # 准备模拟数据
        mock_conversations = [conv_data["conversation"] for conv_data in multiple_conversations]
        
        # 模拟存储库返回对话
        with patch.object(ConversationRepository, 'get_conversations_by_time_range') as mock_get:
            mock_get.return_value = mock_conversations
            
            # 模拟获取消息的方法
            with patch.object(ConversationRepository, 'get_messages_by_conversation_id') as mock_get_messages:
                # 为每个对话设置对应的消息
                def side_effect(conv_id):
                    for conv_data in multiple_conversations:
                        if conv_data["conversation"].id == conv_id:
                            return conv_data["messages"]
                    return []
                
                mock_get_messages.side_effect = side_effect
                
                # 调用索引方法
                count = mock_rag_service.index_all_conversations()
                
                # 验证
                assert count > 0, "应该索引了一些块"
    
    def test_generate_summary(self, mock_rag_service):
        """测试生成总结功能"""
        # 准备测试数据
        query = "Python装饰器如何工作？"
        context = "片段 1:\n用户: 什么是Python装饰器?\n模型(test-model): 装饰器是Python中用于修改函数或类行为的函数，它们允许你在不修改原函数代码的情况下扩展功能。"
        
        # 调用生成总结方法
        summary = mock_rag_service.generate_summary(query, context)
        
        # 验证结果
        assert summary == "这是一个测试总结。", "总结应该来自模拟的LLM响应"
        
        # 验证LLM调用
        mock_rag_service.client.chat.completions.create.assert_called_once()
        # 验证调用参数
        call_args = mock_rag_service.client.chat.completions.create.call_args[1]
        assert call_args["model"] == "test-model"
        assert len(call_args["messages"]) == 2
        assert call_args["messages"][0]["role"] == "system"
        assert call_args["messages"][1]["role"] == "user"
        assert f"查询: {query}" in call_args["messages"][1]["content"]
        assert context in call_args["messages"][1]["content"]
    
    def test_batch_add_conversations(self, mock_rag_service, multiple_conversations):
        """测试批量添加对话"""
        # 准备测试数据
        conversations = [conv_data["conversation"].to_dict() for conv_data in multiple_conversations]
        messages_dict = {}
        for conv_data in multiple_conversations:
            conv_id = conv_data["conversation"].id
            messages_dict[conv_id] = [msg.to_dict() for msg in conv_data["messages"]]
        
        # 模拟vector_db.add_conversation方法
        with patch.object(mock_rag_service.vector_db, 'add_conversation') as mock_add:
            # 设置每次调用返回一个ID列表
            mock_add.side_effect = lambda conv, msgs: [f"{conv['id']}_chunk_0"]
            
            # 调用批量添加方法
            vector_db = mock_rag_service.vector_db
            count = vector_db.add_conversations_batch(conversations, messages_dict)
            
            # 验证结果
            assert count == len(conversations), f"应该添加了{len(conversations)}个对话"
            assert mock_add.call_count == len(conversations), "add_conversation应该被调用多次"
            
            # 验证调用参数
            for i, call_args in enumerate(mock_add.call_args_list):
                assert call_args[0][0]["id"] == conversations[i]["id"], "对话ID应该匹配"
                assert call_args[0][1] == messages_dict[conversations[i]["id"]], "消息应该匹配"
    
    def test_search(self, mock_rag_service, sample_conversation):
        """测试搜索功能"""
        # 准备对话数据
        conv = sample_conversation["conversation"]
        messages = sample_conversation["messages"]
        
        # 转换为字典格式
        conv_dict = conv.to_dict()
        message_dicts = [msg.to_dict() for msg in messages]
        
        # 添加样本对话
        vector_db = mock_rag_service.vector_db
        vector_db.add_conversation(conv_dict, message_dicts)
        
        # 模拟vector_db.query方法返回预期结果
        mock_results = [
            {
                "id": f"{conv.id}_chunk_0",
                "text": "用户: 这是一个测试问题，关于Python的面向对象编程\n模型(test-model): Python的面向对象编程涉及类、对象、继承、多态和封装等概念。",
                "metadata": {
                    "parent_id": conv.id,
                    "model_name": "test-model",
                    "timestamp": conv_dict["timestamp"],
                    "metadata": {"context": "programming", "chunk_index": 0, "total_chunks": 1}
                },
                "relevance_score": 0.95
            }
        ]
        
        with patch.object(vector_db, 'query', return_value=mock_results):
            # 执行搜索
            result = mock_rag_service.search("Python面向对象")
            
            # 验证结果结构
            assert result["query"] == "Python面向对象", "查询文本应该被正确返回"
            assert "summary" in result, "结果应该包含总结"
            assert result["summary"] == "这是一个测试总结。", "总结应该来自模拟的LLM响应"
            assert "results" in result, "结果应该包含检索结果列表"
            
            # 验证检索结果
            assert len(result["results"]) == 1, "应该返回一个结果"
            assert result["results"][0]["id"] == mock_results[0]["id"], "结果ID应该匹配"
            assert result["results"][0]["text"] == mock_results[0]["text"], "结果文本应该匹配"
            assert result["results"][0]["metadata"]["parent_id"] == conv.id, "父ID应该匹配"
            assert result["results"][0]["relevance_score"] == 0.95, "相关性分数应该匹配"
            
            # 验证LLM调用
            mock_rag_service.client.chat.completions.create.assert_called_once()
            
        # 测试无结果情况
        with patch.object(vector_db, 'query', return_value=[]):
            empty_result = mock_rag_service.search("不存在的查询")
            assert empty_result["summary"] == "未找到相关的历史对话。", "无结果时应返回特定消息"
            assert len(empty_result["results"]) == 0, "结果列表应为空"