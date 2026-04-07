#!/usr/bin/env python3
"""
手动触发对话索引到向量数据库
用于 RAG 知识搜索功能
"""

import sys
from app.services.rag_service import RAGService
from app.config import MODEL_CONFIGS


def main():
    print("=" * 50)
    print("对话索引工具 - 将 SQLite 对话向量化到 ChromaDB")
    print("=" * 50)

    # 初始化 RAG 服务
    rag = RAGService(
        model=MODEL_CONFIGS['qwen']['model'],
        api_key=MODEL_CONFIGS['qwen']['api_key'],
        base_url=MODEL_CONFIGS['qwen']['base_url']
    )

    # 检查当前索引状态
    before_count = rag.vector_db.collection.count()
    print(f"\n索引前向量数据库中的片段数: {before_count}")

    # 获取 SQLite 中的对话数量
    from app.repositories.conversation_repository import ConversationRepository
    repo = ConversationRepository()
    all_conv = repo.get_conversations_by_time_range(limit=1000)
    print(f"SQLite 数据库中的对话数: {len(all_conv)}")

    # 询问用户
    print("\n选项:")
    print("1. 索引最近 N 天的对话")
    print("2. 索引所有对话")
    print("3. 仅查看状态，不索引")

    try:
        choice = input("\n请选择 (1/2/3): ").strip()

        if choice == "1":
            days = input("请输入天数 (默认 7): ").strip()
            days = int(days) if days else 7
            print(f"\n开始索引最近 {days} 天的对话...")
            count = rag.index_all_conversations(days_limit=days)
            print(f"✓ 成功索引 {count} 个对话片段")

        elif choice == "2":
            print("\n开始索引所有对话...")
            count = rag.index_all_conversations()
            print(f"✓ 成功索引 {count} 个对话片段")

        elif choice == "3":
            print("\n仅查看状态")

        else:
            print("无效选项")
            return

        # 显示索引后的状态
        after_count = rag.vector_db.collection.count()
        print(f"\n索引后向量数据库中的片段数: {after_count}")

        if after_count > before_count:
            print(f"新增: {after_count - before_count} 个片段")

        print("\n✓ 索引完成！现在可以在知识搜索模块中搜索这些对话了。")

    except KeyboardInterrupt:
        print("\n\n操作已取消")
    except Exception as e:
        print(f"\n✗ 错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
