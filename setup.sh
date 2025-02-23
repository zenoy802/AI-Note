# 检查Python版本
python_version=$(python -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
required_version="3.9"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "Error: This project requires Python $required_version or higher"
    exit 1
fi

mkdir AI-Note
cd AI-Note
python -m venv venv
pip install fastapi uvicorn sqlalchemy psycopg2-binary langchain python-dotenv faiss-cpu openai 