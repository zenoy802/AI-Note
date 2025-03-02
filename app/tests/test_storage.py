import os
import pytest
import uuid
from datetime import datetime, timedelta
import shutil
from pathlib import Path

from ..models.conversation import Conversation
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
            model_name="test-model",
            timestamp=datetime.utcnow(),
            user_input="This is a test question",
            model_response="This is a test answer",
            metadata={"test_key": "test_value"}
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
        assert retrieved.model_name == sample_conversation.model_name
        assert retrieved.user_input == sample_conversation.user_input
        assert retrieved.model_response == sample_conversation.model_response
        assert retrieved.metadata == sample_conversation.metadata
    
    def test_get_conversations_by_time_range(self, repo):
        """Test retrieving conversations by time range"""
        # Create conversations with different timestamps
        now = datetime.utcnow()
        
        old_conv = Conversation(
            model_name="test-model",
            timestamp=now - timedelta(days=10),
            user_input="Old question",
            model_response="Old answer",
            metadata={}
        )
        
        recent_conv = Conversation(
            model_name="test-model",
            timestamp=now - timedelta(days=1),
            user_input="Recent question",
            model_response="Recent answer",
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
    
    def test_search_conversations(self, repo, sample_conversation):
        """Test searching conversations"""
        # Create a unique searchable conversation
        unique_text = f"unique_search_term_{uuid.uuid4()}"
        search_conv = Conversation(
            model_name="test-model",
            timestamp=datetime.utcnow(),
            user_input=f"Question with {unique_text}",
            model_response="Test answer",
            metadata={}
        )
        
        # 保存对话
        repo.save_conversation(search_conv)
        
        # 搜索唯一文本 - 使用引号包围以确保精确匹配
        results = repo.search_conversations(f'"{unique_text}"')
        
        # 验证
        assert len(results) == 1
        assert results[0].id == search_conv.id
        assert unique_text in results[0].user_input
    
    def test_get_recent_conversations(self, repo):
        """Test getting recent conversations"""
        # Create a conversation
        conv = Conversation(
            model_name="test-model",
            timestamp=datetime.utcnow(),
            user_input="Recent test question",
            model_response="Recent test answer",
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
    
    def test_delete_conversation(self, repo, sample_conversation):
        """Test deleting a conversation"""
        # Save conversation
        repo.save_conversation(sample_conversation)
        
        # Delete conversation
        result = repo.delete_conversation(sample_conversation.id)
        
        # Verify deletion was successful
        assert result is True
        
        # Verify conversation no longer exists
        retrieved = repo.get_conversation_by_id(sample_conversation.id)
        assert retrieved is None
    
    def test_json_backup(self, repo, sample_conversation):
        """Test JSON backup functionality"""
        # Save conversation
        repo.save_conversation(sample_conversation)
        
        # Check that backup file exists
        date_str = sample_conversation.timestamp.strftime("%Y-%m-%d")
        backup_file = repo.backup_dir / f"{date_str}.json"
        
        assert backup_file.exists(), "Backup file was not created"
        
        # Load backup file and verify our conversation is in it
        import json
        with open(backup_file, "r", encoding="utf-8") as f:
            backup_data = json.load(f)
        
        # Find our conversation in backup
        found = False
        for conv in backup_data:
            if conv.get("id") == sample_conversation.id:
                found = True
                break
        
        assert found, "Conversation not found in JSON backup" 