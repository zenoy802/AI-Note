from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import chat
from dotenv import load_dotenv
import os

# 加载环境变量
load_dotenv()

# 验证必要的环境变量
required_env_vars = ["DASHSCOPE_API_KEY", "MOONSHOT_API_KEY"]
missing_vars = [var for var in required_env_vars if not os.getenv(var)]
if missing_vars:
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

app = FastAPI(title="AI-Note API")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

@app.get("/")
async def root():
    return {"message": "Welcome to AI-Note API"} 