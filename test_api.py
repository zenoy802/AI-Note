#!/usr/bin/env python
# -*- coding: utf-8 -*-

import re
import json
import time
import subprocess
import requests
import argparse
from urllib.parse import urlparse, parse_qs
from typing import Dict, List, Any, Tuple, Optional
import sys
import os


class CurlParser:
    """解析curl命令并转换为Python请求参数"""
    
    @staticmethod
    def parse_curl(curl_command: str) -> Dict[str, Any]:
        """解析curl命令，返回请求参数字典"""
        # 初始化参数字典
        params = {
            'method': 'GET',  # 默认方法
            'url': '',
            'headers': {},
            'data': None
        }
        
        # 提取URL
        url_match = re.search(r'"(http[^"]+)"', curl_command)
        if url_match:
            params['url'] = url_match.group(1)
        
        # 提取请求方法
        method_match = re.search(r'-X\s+([A-Z]+)', curl_command)
        if method_match:
            params['method'] = method_match.group(1)
        
        # 提取请求头
        header_matches = re.finditer(r'-H\s+"([^"]+)"', curl_command)
        for match in header_matches:
            header_line = match.group(1)
            if ':' in header_line:
                key, value = header_line.split(':', 1)
                params['headers'][key.strip()] = value.strip()
        
        # 提取请求体 - 修改正则表达式以支持多行JSON
        # 首先尝试匹配单引号包围的多行JSON
        data_match = re.search(r'-d\s+\'([\s\S]*?)\'(?=\s+\\|\s*$)', curl_command)
        if not data_match:
            # 然后尝试匹配双引号包围的多行JSON
            data_match = re.search(r'-d\s+"([\s\S]*?)"(?=\s+\\|\s*$)', curl_command)
        
        # 如果上面都没匹配到，尝试匹配花括号之间的内容
        if not data_match:
            data_match = re.search(r'-d\s+\'\s*\{([\s\S]*?)\}\s*\'', curl_command)
            if data_match:
                data_str = '{' + data_match.group(1) + '}'
            else:
                data_match = re.search(r'-d\s+"\s*\{([\s\S]*?)\}\s*"', curl_command)
                if data_match:
                    data_str = '{' + data_match.group(1) + '}'
        else:
            data_str = data_match.group(1)
        
        if data_match:
            try:
                # 尝试解析为JSON
                params['data'] = json.loads(data_str)
            except json.JSONDecodeError:
                # 如果不是JSON，则作为普通字符串
                params['data'] = data_str
        
        return params


class APITester:
    """API测试工具，用于执行API调用并显示结果"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.conversation_id = None  # 存储对话ID，用于后续测试
        self.session = requests.Session()
    
    def execute_request(self, params: Dict[str, Any]) -> Tuple[int, Dict]:
        """执行API请求"""
        method = params['method']
        url = params['url']
        headers = params['headers']
        data = params['data']
        
        # 打印请求信息
        print(f"\n执行请求: {method} {url}")
        if headers:
            print(f"请求头: {json.dumps(headers, ensure_ascii=False, indent=2)}")
        if data:
            print(f"请求体: {json.dumps(data, ensure_ascii=False, indent=2)}")
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                headers=headers,
                json=data if isinstance(data, dict) else None,
                data=data if not isinstance(data, dict) else None,
                timeout=10
            )
            
            # 尝试解析响应为JSON
            try:
                response_data = response.json()
            except json.JSONDecodeError:
                response_data = {"text": response.text}
            
            # 打印响应信息
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response_data, ensure_ascii=False, indent=2)[:500]}")
            if len(json.dumps(response_data, ensure_ascii=False)) > 500:
                print("... (响应内容已截断)")
            
            # 如果是对话API，保存conversation_id用于后续测试
            if 'conversation_id' in response_data:
                self.conversation_id = response_data['conversation_id']
                print(f"保存conversation_id: {self.conversation_id}")
            
            return response.status_code, response_data
            
        except Exception as e:
            print(f"请求失败: {str(e)}")
            return 0, {"error": str(e)}
    
    def parse_and_execute_curl(self, curl_command: str) -> Tuple[int, Dict]:
        """解析curl命令并执行"""
        params = CurlParser.parse_curl(curl_command)
        
        # 替换URL中的conversation_id占位符
        if self.conversation_id and "conversation_id=" in params['url']:
            params['url'] = re.sub(
                r'conversation_id=[^&]+', 
                f'conversation_id={self.conversation_id}',
                params['url']
            )
        
        return self.execute_request(params)


def extract_curl_commands(file_path: str) -> List[Tuple[str, str]]:
    """从文件中提取curl命令及其描述"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 查找所有curl命令及其描述
    curl_commands = []
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # 查找描述（以#开头的行）
        if line.startswith('#') and 'curl' not in line:
            description = line
            
            # 查找接下来的curl命令
            curl_cmd = ""
            j = i + 1
            # 继续读取直到遇到下一个以#开头的行或文件结束
            while j < len(lines) and not lines[j].strip().startswith('#'):
                if lines[j].strip():
                    curl_cmd += lines[j] + "\n"
                j += 1
            
            # 如果找到了curl命令，添加到列表
            if 'curl' in curl_cmd:
                curl_commands.append((description, curl_cmd.strip()))
                i = j - 1  # 跳过已处理的行
        i += 1
    
    return curl_commands


def wait_for_server(url: str, max_retries: int = 30, retry_interval: int = 2) -> bool:
    """等待服务器启动"""
    print(f"等待服务器在 {url} 启动...")
    for i in range(max_retries):
        try:
            response = requests.get(url, timeout=1)
            if response.status_code < 500:  # 任何非500错误都表示服务器已启动
                print(f"服务器已启动! 状态码: {response.status_code}")
                return True
        except requests.RequestException:
            pass
        
        print(f"重试 {i+1}/{max_retries}...")
        time.sleep(retry_interval)
    
    print("服务器启动超时!")
    return False


def start_server(command: str) -> subprocess.Popen:
    """启动服务器"""
    print(f"启动服务器: {command}")
    process = subprocess.Popen(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    return process


def main():
    parser = argparse.ArgumentParser(description='自动测试API')
    parser.add_argument('--file', default='local.test', help='包含curl命令的文件')
    parser.add_argument('--base-url', default='http://localhost:8000', help='API基础URL')
    parser.add_argument('--start-server', action='store_true', help='是否自动启动服务器')
    parser.add_argument('--server-command', default='uvicorn app.main:app --reload', help='启动服务器的命令')
    args = parser.parse_args()
    
    server_process = None
    
    try:
        # 如果需要，启动服务器
        if args.start_server:
            server_process = start_server(args.server_command)
            # 等待服务器启动
            if not wait_for_server(args.base_url):
                print("无法启动服务器，退出测试")
                return
        
        # 提取curl命令
        curl_commands = extract_curl_commands(args.file)
        
        if not curl_commands:
            print(f"在文件 {args.file} 中没有找到curl命令")
            return
        
        # 初始化API测试器
        tester = APITester(args.base_url)
        
        # 执行每个curl命令
        for i, (description, curl_command) in enumerate(curl_commands, 1):
            print(f"\n{'='*50}")
            print(f"测试 {i}/{len(curl_commands)}: {description}")
            print(f"{'='*50}")
            
            # 跳过单元测试命令
            if 'pytest' in curl_command:
                print("跳过单元测试命令")
                continue
            
            # 解析并执行curl命令
            status_code, _ = tester.parse_and_execute_curl(curl_command)
            
            # 如果请求失败，给出警告但继续执行
            if status_code == 0 or status_code >= 400:
                print(f"警告: 请求返回错误状态码 {status_code}")
            
            # 在请求之间添加短暂延迟
            time.sleep(1)
        
        print("\n所有API测试完成!")
    
    finally:
        # 如果我们启动了服务器，尝试关闭它
        if server_process:
            print("关闭服务器...")
            server_process.terminate()
            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_process.kill()


if __name__ == "__main__":
    main()