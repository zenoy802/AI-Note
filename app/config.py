import os
from dotenv import load_dotenv
from pathlib import Path

# 获取当前文件所在目录
current_dir = Path(__file__).parent
# 加载环境变量，指定.env文件的路径
load_dotenv(current_dir / ".env")

# 预定义可用的模型配置
MODEL_CONFIGS = {
    "qwen": {
        "api_key": os.getenv("DASHSCOPE_API_KEY"),
        "base_url": os.getenv("DASHSCOPE_BASE_URL"),
        "model": "qwen-max",
        "system_prompt": "You are a helpful AI assistant."
    },
    "kimi": {
        "api_key": os.getenv("MOONSHOT_API_KEY"),
        "base_url": os.getenv("MOONSHOT_BASE_URL"),
        "model": "kimi-latest",
        "system_prompt": "You are a helpful AI assistant."
    },
    "deepseek": {
        "api_key": os.getenv("DEEPSEEK_API_KEY"),
        "base_url": os.getenv("DEEPSEEK_BASE_URL"),
        "model": "deepseek-reasoner"
    },
    "gemini": {
        "api_key": os.getenv("GEMINI_API_KEY"),
        "base_url": os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai"),
        "model": "gemini-3.1-pro-preview",
        "system_prompt": "You are a helpful AI assistant."
    },
    "claude": {
        "api_key": os.getenv("CLAUDE_API_KEY"),
        "base_url": os.getenv("CLAUDE_BASE_URL"),
        "model": "claude-opus-4-6",
        "system_prompt": "You are a helpful AI assistant."
    },
    "gpt": {
        "api_key": os.getenv("GPT_API_KEY") or os.getenv("OPENAI_API_KEY"),
        "base_url": os.getenv("GPT_BASE_URL", os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")),
        "model": "gpt-5.4",
        "system_prompt": "You are a helpful AI assistant."
    }
}
