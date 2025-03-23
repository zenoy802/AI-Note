# AI-Note API 文档

本文档详细描述了AI-Note应用的API接口，包括聊天相关接口和搜索相关接口。

## 目录

- [聊天相关接口](#聊天相关接口)
  - [开始新对话](#开始新对话)
  - [继续对话](#继续对话)
  - [搜索历史对话](#搜索历史对话)
  - [获取最近对话](#获取最近对话)
  - [获取单个对话详情(按ID)](#获取单个对话详情按id)
  - [获取单个对话详情(按标题)](#获取单个对话详情按标题)
  - [获取指定模型的对话历史](#获取指定模型的对话历史)
  - [获取可用模型列表](#获取可用模型列表)
- [搜索相关接口](#搜索相关接口)
  - [向量搜索对话](#向量搜索对话)
  - [索引对话](#索引对话)
  - [获取索引状态](#获取索引状态)

## 聊天相关接口

### 开始新对话

- **URL**: `/start_chat`
- **方法**: `POST`
- **描述**: 使用指定的模型开始一个新的对话

#### 请求参数

```json
{
  "model_chats_dict": {
    "模型名称": {
      "user_input": "用户输入的文本",
      "conversation_id": null
    }
  }
}
```

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| model_chats_dict | Object | 是 | 包含模型名称和对应聊天信息的字典 |
| model_chats_dict.{model_name} | Object | 是 | 模型名称作为键，对应的聊天信息作为值 |
| model_chats_dict.{model_name}.user_input | String | 是 | 用户输入的文本 |
| model_chats_dict.{model_name}.conversation_id | String | 否 | 对话ID，新对话时为null |

#### 响应

```json
{
  "chat_dict": {
    "模型名称": [
      {
        "role": "user",
        "content": "用户输入的文本"
      },
      {
        "role": "assistant",
        "content": "模型的回复"
      }
    ]
  }
}
```

#### 错误响应

- **400 Bad Request**: 不支持的模型
- **500 Internal Server Error**: 服务器内部错误

### 继续对话

- **URL**: `/continue_chat`
- **方法**: `POST`
- **描述**: 继续已有的对话

#### 请求参数

```json
{
  "model_chats_dict": {
    "模型名称": {
      "user_input": "用户输入的文本",
      "conversation_id": "对话ID"
    }
  }
}
```

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| model_chats_dict | Object | 是 | 包含模型名称和对应聊天信息的字典 |
| model_chats_dict.{model_name} | Object | 是 | 模型名称作为键，对应的聊天信息作为值 |
| model_chats_dict.{model_name}.user_input | String | 是 | 用户输入的文本 |
| model_chats_dict.{model_name}.conversation_id | String | 是 | 对话ID |

#### 响应

```json
{
  "chat_dict": {
    "模型名称": [
      {
        "role": "user",
        "content": "用户输入的文本"
      },
      {
        "role": "assistant",
        "content": "模型的回复"
      }
    ]
  }
}
```

#### 错误响应

- **400 Bad Request**: 不支持的模型
- **500 Internal Server Error**: 服务器内部错误

### 搜索历史对话

- **URL**: `/history/search`
- **方法**: `GET`
- **描述**: 搜索历史对话记录

#### 请求参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| keyword | String | 是 | 搜索关键词 |
| limit | Integer | 否 | 最大返回结果数，默认为20 |

#### 响应

```json
{
  "results": [
    {
      "conversation": {
        "id": "对话ID",
        "session_title": "对话标题",
        "model_name": "模型名称",
        "timestamp": "对话时间"
      },
      "match_contexts": [
        {
          "role": "user/assistant",
          "text": "匹配的文本上下文",
          "timestamp": "消息时间"
        }
      ]
    }
  ],
  "count": 1
}
```

#### 错误响应

- **500 Internal Server Error**: 服务器内部错误

### 获取最近对话

- **URL**: `/history/recent`
- **方法**: `GET`
- **描述**: 获取最近的对话记录

#### 请求参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| days | Integer | 否 | 最近几天的对话，默认为7天 |
| limit | Integer | 否 | 最大返回结果数，默认为50 |

#### 响应

```json
{
  "results": [
    {
      "id": "对话ID",
      "user_id": "用户ID",
      "session_title": "对话标题",
      "model_name": "模型名称",
      "timestamp": "对话时间",
      "metadata": {}
    }
  ],
  "count": 1
}
```

#### 错误响应

- **500 Internal Server Error**: 服务器内部错误

### 获取单个对话详情(按ID)

- **URL**: `/history/conversation`
- **方法**: `GET`
- **描述**: 获取单个对话详情

#### 请求参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| conversation_id | String | 是 | 对话ID |

#### 响应

返回消息列表：

```json
[
  {
    "id": "消息ID",
    "conversation_id": "对话ID",
    "role": "user/assistant",
    "content": "消息内容",
    "sequence_id": 1,
    "timestamp": "消息时间",
    "feedback": null
  }
]
```

#### 错误响应

- **404 Not Found**: 对话不存在
- **500 Internal Server Error**: 服务器内部错误

### 获取单个对话详情(按标题)

- **URL**: `/history/title`
- **方法**: `GET`
- **描述**: 根据标题获取对话详情

#### 请求参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| title | String | 是 | 对话标题(模糊匹配) |

#### 响应

返回按模型分组的消息字典：

```json
{
  "模型名称": [
    {
      "id": "消息ID",
      "conversation_id": "对话ID",
      "role": "user/assistant",
      "content": "消息内容",
      "sequence_id": 1,
      "timestamp": "消息时间",
      "feedback": null
    }
  ]
}
```

#### 错误响应

- **404 Not Found**: 对话不存在
- **500 Internal Server Error**: 服务器内部错误

### 获取指定模型的对话历史

- **URL**: `/history/by_model`
- **方法**: `GET`
- **描述**: 获取指定模型的对话历史

#### 请求参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| model_name | String | 是 | 模型名称 |
| limit | Integer | 否 | 最大返回结果数，默认为50 |
| offset | Integer | 否 | 分页偏移量，默认为0 |

#### 响应

```json
{
  "results": [
    {
      "id": "对话ID",
      "user_id": "用户ID",
      "session_title": "对话标题",
      "model_name": "模型名称",
      "timestamp": "对话时间",
      "metadata": {}
    }
  ],
  "count": 1
}
```

#### 错误响应

- **400 Bad Request**: 不支持的模型
- **500 Internal Server Error**: 服务器内部错误

### 获取可用模型列表

- **URL**: `/available_models`
- **方法**: `GET`
- **描述**: 获取可用的模型列表

#### 响应

```json
{
  "models": ["模型1", "模型2"]
}
```

## 搜索相关接口

### 向量搜索对话

- **URL**: `/search`
- **方法**: `POST`
- **描述**: 搜索历史对话并生成总结

#### 请求参数

```json
{
  "query": "搜索查询文本",
  "top_k": 3
}
```

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| query | String | 是 | 搜索查询文本 |
| top_k | Integer | 否 | 返回的最相关结果数量，默认为3 |

#### 响应

返回RAG服务生成的搜索结果和总结。

#### 错误响应

- **500 Internal Server Error**: 服务器内部错误

### 索引对话

- **URL**: `/index`
- **方法**: `POST`
- **描述**: 将对话索引到向量数据库（异步任务）

#### 请求参数

```json
{
  "days_limit": null
}
```

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| days_limit | Integer | 否 | 索引最近几天的对话，null表示索引所有对话 |

#### 响应

```json
{
  "status": "indexing started",
  "message": "对话索引任务已开始，这可能需要一些时间完成"
}
```

#### 错误响应

- **500 Internal Server Error**: 服务器内部错误

### 获取索引状态

- **URL**: `/index/status`
- **方法**: `GET`
- **描述**: 获取索引状态

#### 响应

```json
{
  "status": "active",
  "indexed_chunks": 123
}
```

#### 错误响应

- **500 Internal Server Error**: 服务器内部错误