#!/usr/bin/env python3
"""本地预览服务器：禁用缓存，避免改源码后浏览器仍用旧文件。

用法：python3 tools/serve.py [端口]   （默认 8080）
"""
import http.server
import socketserver
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", port), NoCacheHandler) as httpd:
        print(f"Serving at http://127.0.0.1:{port}/  (Ctrl+C 停止)")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
