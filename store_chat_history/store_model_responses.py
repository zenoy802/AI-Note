import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
import time

# 添加项目根目录到Python路径，以便导入app模块
sys.path.append(str(Path(__file__).parent.parent))

from app.services.chat_service import ChatClient, ChatService
from app.models.conversation import Conversation
from app.repositories.conversation_repository import ConversationRepository
from app.config import MODEL_CONFIGS

# 加载环境变量
load_dotenv(dotenv_path=Path(__file__).parent.parent / 'app' / '.env')

# 从JSON文件加载预设问题列表
def load_questions():
    """从JSON文件加载预设问题"""
    questions_file = Path(__file__).parent / 'questions.json'
    try:
        with open(questions_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"错误：问题文件 {questions_file} 不存在")
        return []
    except json.JSONDecodeError:
        print(f"错误：问题文件 {questions_file} 格式不正确")
        return []

# 加载预设问题
QUESTIONS = load_questions()

def initialize_chat_clients(model_names):
    """初始化聊天客户端"""
    chat_clients = {}
    for model_name in model_names:
        if model_name not in MODEL_CONFIGS:
            print(f"不支持的模型: {model_name}")
            continue
        
        config = MODEL_CONFIGS[model_name]
        chat_clients[model_name] = ChatClient(
            api_key=config["api_key"],
            base_url=config["base_url"],
            model=config["model"],
            system_prompt=config["system_prompt"]
        )
    
    return chat_clients

def store_chat_history(model_names=None):
    """存储预设问题的聊天历史"""
    if model_names is None:
        model_names = list(MODEL_CONFIGS.keys())
    
    # 初始化聊天客户端
    chat_clients = initialize_chat_clients(model_names)
    
    if not chat_clients:
        print("没有可用的聊天客户端，请检查模型配置和环境变量")
        return
    
    # 初始化聊天服务
    chat_service = ChatService(chat_clients)
    
    # 存储每个模型的对话历史，用于后续的continue_chat
    history_chat_dict = {}
    
    # 处理预设问题
    for _, questions in enumerate(QUESTIONS):
        for i, question in enumerate(questions):
            print(f"\n处理问题 {i+1}/{len(questions)}: {question}")
            
            # 第一个问题使用start_chat，后续问题使用continue_chat
            if i == 0:
                chat_dict = chat_service.start_chat(question)
                # 初始化历史记录
                history_chat_dict = chat_dict
            else:
                chat_dict = chat_service.continue_chat(question, history_chat_dict)
            
            # 打印每个模型的回复
            for model, messages in chat_dict.items():
                # 获取最后一条助手消息
                assistant_messages = [msg for msg in messages if msg["role"] == "assistant"]
                if assistant_messages:
                    last_response = assistant_messages[-1]["content"]
                    print(f"\n模型 {model} 的回复:\n{last_response[:100]}...")
            
            # 添加一些延迟，避免API请求过快
            time.sleep(2)
    
    print("\n所有问题处理完成，对话历史已保存到数据库")

if __name__ == "__main__":
    # 可以通过命令行参数指定要使用的模型
    import argparse
    
    parser = argparse.ArgumentParser(description="存储大模型对预设问题的回复")
    parser.add_argument(
        "--models", 
        nargs="+", 
        default=list(MODEL_CONFIGS.keys()),
        help="要使用的模型名称，多个模型用空格分隔"
    )
    
    args = parser.parse_args()
    store_chat_history(args.models)