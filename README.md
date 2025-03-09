# AI-Note

An API service for multi-model chat and conversation history management.

## Table of Contents

- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Testing](#testing)
  - [Unit Tests](#unit-tests)
  - [API Endpoints Testing](#api-endpoints-testing)
- [API Documentation](#api-documentation)
  - [Chat API](#chat-api)
  - [History API](#history-api)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd AI-Note
   ```

2. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   Create a `.env` file in the app directory with the following variables:
   ```
   DASHSCOPE_API_KEY=your_dashscope_api_key
   MOONSHOT_API_KEY=your_moonshot_api_key
   DEEPSEEK_API_KEY=your_deepseek_api_key

   DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
   MOONSHOT_BASE_URL=https://api.moonshot.cn/v1
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   ```

4. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

## Running the Application

Start the FastAPI server with hot reloading enabled:

```bash
uvicorn app.main:app --reload
```
The API will be available at http://localhost:8000.


Start the Webview:
```bash
cd frontend
npm run dev
```
The Webview will be available at http://localhost:3000.


## Testing

### Unit Tests

Run the unit tests of different modules:

```bash
pytest -xvs app/tests/test_storage.py
```

```bash
pytest -xvs app/tests/test_rag.py
```

To view database contents for debugging:

```bash
python -m app.utils.db_viewer
```

### API Endpoints Testing

Check `app/routers/` for API definitions.