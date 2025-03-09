import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 预定义可用的模型配置
MODEL_CONFIGS = {
    "qwen": {
        "api_key": os.getenv("DASHSCOPE_API_KEY"),
        "base_url": os.getenv("DASHSCOPE_BASE_URL"),
        "model": "qwen-turbo",
        "system_prompt": "You are a helpful AI assistant."
    },
    "kimi": {
        "api_key": os.getenv("MOONSHOT_API_KEY"),
        "base_url": os.getenv("MOONSHOT_BASE_URL"),
        "model": "moonshot-v1-8k",
        "system_prompt": "You are Kimi, a helpful AI assistant."
    }
}