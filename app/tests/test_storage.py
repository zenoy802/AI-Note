import os
import pytest
import uuid
from datetime import datetime, timedelta
import shutil
from pathlib import Path
import json

from ..models.conversation import Conversation
from ..models.message import Message
from ..repositories.conversation_repository import ConversationRepository
from ..utils.db_utils import init_db


# Setup test database
TEST_DB_CREATED = False
ORIGINAL_DB_BACKED_UP = False

def setup_module():
    """Setup test environment before running tests"""
    global TEST_DB_CREATED, ORIGINAL_DB_BACKED_UP
    
    # Backup original database if exists
    data_dir = Path("data")
    db_path = data_dir / "conversations.db"
    backup_path = data_dir / "conversations.db.bak"
    
    if db_path.exists() and not backup_path.exists():
        shutil.copy(db_path, backup_path)
        ORIGINAL_DB_BACKED_UP = True
    
    # Initialize fresh database
    init_db()
    TEST_DB_CREATED = True


def teardown_module():
    """Clean up after tests"""
    global ORIGINAL_DB_BACKED_UP
    
    # Restore original database if backed up
    if ORIGINAL_DB_BACKED_UP:
        data_dir = Path("data")
        db_path = data_dir / "conversations.db"
        backup_path = data_dir / "conversations.db.bak"
        
        if db_path.exists():
            os.remove(db_path)
        
        shutil.move(backup_path, db_path)


class TestConversationRepository:
    """Test the ConversationRepository class"""
    
    @pytest.fixture
    def repo(self):
        """Create a repository instance for testing"""
        return ConversationRepository()
    
    @pytest.fixture
    def sample_conversation(self):
        """Create a sample conversation for testing"""
        return Conversation(
            id=str(uuid.uuid4()),
            user_id="test-user",
            session_title="Test Conversation",
            model_name="test-model",
            timestamp=datetime.utcnow(),
            metadata={"test_key": "test_value"}
        )
    
    @pytest.fixture
    def sample_message(self, sample_conversation):
        """Create a sample message for testing"""
        return Message(
            id=str(uuid.uuid4()),
            conversation_id=sample_conversation.id,
            role="user",
            content="This is a test message",
            sequence_id=1,
            timestamp=datetime.utcnow(),
            feedback=None
        )
    
    @pytest.fixture
    def sample_response_message(self, sample_conversation):
        """Create a sample response message for testing"""
        return Message(
            id=str(uuid.uuid4()),
            conversation_id=sample_conversation.id,
            role="assistant",
            content="This is a test response",
            sequence_id=2,
            timestamp=datetime.utcnow(),
            feedback=None
        )
    
    def test_save_and_get_conversation(self, repo, sample_conversation):
        """Test saving and retrieving a conversation"""
        # Save conversation
        conversation_id = repo.save_conversation(sample_conversation)
        
        # Retrieve conversation
        retrieved = repo.get_conversation_by_id(conversation_id)
        
        # Verify
        assert retrieved is not None
        assert retrieved.id == sample_conversation.id
        assert retrieved.user_id == sample_conversation.user_id
        assert retrieved.session_title == sample_conversation.session_title
        assert retrieved.model_name == sample_conversation.model_name
        assert retrieved.metadata == sample_conversation.metadata
    
    def test_save_and_get_message(self, repo, sample_conversation, sample_message):
        """Test saving and retrieving a message"""
        # Save conversation first
        repo.save_conversation(sample_conversation)
        
        # Save message
        message_id = repo.save_message(sample_message)
        
        # Retrieve messages for the conversation
        messages = repo.get_messages_by_conversation_id(sample_conversation.id)
        
        # Verify
        assert len(messages) == 1
        assert messages[0].id == sample_message.id
        assert messages[0].conversation_id == sample_message.conversation_id
        assert messages[0].role == sample_message.role
        assert messages[0].content == sample_message.content
        assert messages[0].sequence_id == sample_message.sequence_id
    
    def test_conversation_with_messages(self, repo, sample_conversation, sample_message, sample_response_message):
        """Test a complete conversation flow with multiple messages"""
        # Save conversation
        repo.save_conversation(sample_conversation)
        
        # Save messages
        repo.save_message(sample_message)
        repo.save_message(sample_response_message)
        
        # Retrieve messages
        messages = repo.get_messages_by_conversation_id(sample_conversation.id)
        
        # Verify
        assert len(messages) == 2
        assert messages[0].sequence_id < messages[1].sequence_id
        assert messages[0].role == "user"
        assert messages[1].role == "assistant"
    
    def test_get_conversations_by_time_range(self, repo):
        """Test retrieving conversations by time range"""
        # Create conversations with different timestamps
        now = datetime.utcnow()
        
        old_conv = Conversation(
            model_name="test-model",
            session_title="Old Conversation",
            timestamp=now - timedelta(days=10),
            metadata={}
        )
        
        recent_conv = Conversation(
            model_name="test-model",
            session_title="Recent Conversation",
            timestamp=now - timedelta(days=1),
            metadata={}
        )
        
        # Save conversations
        repo.save_conversation(old_conv)
        repo.save_conversation(recent_conv)
        
        # Test time range query - should get only recent
        start_time = now - timedelta(days=5)
        results = repo.get_conversations_by_time_range(start_time=start_time)
        
        # Verify
        assert len(results) >= 1  # Might be more if there's existing data
        
        # Make sure our recent conversation is in results
        found = False
        for conv in results:
            if conv.id == recent_conv.id:
                found = True
                break
        
        assert found, "Recent conversation not found in time range results"
    
    def test_search_messages(self, repo, sample_conversation, sample_message):
        """Test searching messages"""
        # Create a unique searchable message
        unique_text = f"unique_search_term_{uuid.uuid4()}"
        search_conv = Conversation(
            model_name="test-model",
            session_title="Search Test",
            timestamp=datetime.utcnow(),
            metadata={}
        )
        
        search_message = Message(
            conversation_id=search_conv.id,
            role="user",
            content=f"Question with {unique_text}",
            sequence_id=1,
            timestamp=datetime.utcnow()
        )
        
        # 保存对话和消息
        repo.save_conversation(search_conv)
        repo.save_message(search_message)
        
        # 搜索唯一文本
        results = repo.search_messages(unique_text)
        
        # 验证
        assert len(results) == 1
        assert results[0]["conversation"]["id"] == search_conv.id
        assert unique_text in results[0]["match_contexts"][0]["text"]
    
    def test_get_recent_conversations(self, repo):
        """Test getting recent conversations"""
        # Create a conversation
        conv = Conversation(
            model_name="test-model",
            session_title="Recent Test",
            timestamp=datetime.utcnow(),
            metadata={}
        )
        
        # Save conversation
        repo.save_conversation(conv)
        
        # Get recent conversations
        results = repo.get_recent_conversations(days=1)
        
        # Verify our conversation is included
        found = False
        for result in results:
            if result.id == conv.id:
                found = True
                break
        
        assert found, "New conversation not found in recent conversations"
    
    def test_delete_conversation(self, repo, sample_conversation, sample_message):
        """Test deleting a conversation and its messages"""
        # Save conversation and message
        repo.save_conversation(sample_conversation)
        repo.save_message(sample_message)
        
        # Verify message exists
        messages_before = repo.get_messages_by_conversation_id(sample_conversation.id)
        assert len(messages_before) == 1
        
        # Delete conversation
        result = repo.delete_conversation(sample_conversation.id)
        
        # Verify deletion was successful
        assert result is True
        
        # Verify conversation no longer exists
        retrieved = repo.get_conversation_by_id(sample_conversation.id)
        assert retrieved is None
        
        # Verify messages were also deleted
        messages_after = repo.get_messages_by_conversation_id(sample_conversation.id)
        assert len(messages_after) == 0
    
    def test_json_backup(self, repo, sample_conversation):
        """Test JSON backup functionality"""
        # Save conversation
        repo.save_conversation(sample_conversation)
        
        # Check that backup file exists
        date_str = sample_conversation.timestamp.strftime("%Y-%m-%d")
        backup_file = repo.backup_dir / f"{date_str}.json"
        
        assert backup_file.exists(), "Backup file was not created"
        
        # Load backup file and verify our conversation is in it
        with open(backup_file, "r", encoding="utf-8") as f:
            backup_data = json.load(f)
        
        # Find our conversation in backup
        found = False
        for conv in backup_data:
            if conv.get("id") == sample_conversation.id:
                found = True
                break
        
        assert found, "Conversation not found in JSON backup"