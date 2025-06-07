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
        "system_prompt": "You are Kimi, a helpful AI assistant."
    },
    "deepseek": {
        "api_key": os.getenv("DEEPSEEK_API_KEY"),
        "base_url": os.getenv("DEEPSEEK_BASE_URL"),
        "model": "deepseek-reasoner"
    }
}