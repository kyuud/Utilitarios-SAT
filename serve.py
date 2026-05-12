#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════
 PAINEL UNIFICADO — Servidor de Desenvolvimento

 Sobe um servidor HTTP local na porta 8080 para servir os
 arquivos JS durante desenvolvimento com Tampermonkey.

 Uso:  python serve.py
 URL:  http://localhost:8080/PainelUnificado/core/ui.js
═══════════════════════════════════════════════════════════
"""

import http.server
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
# Servir a partir do diretório pai para que URLs /PainelUnificado/... funcionem
SERVE_ROOT = os.path.dirname(DIRECTORY)


class CORSHandler(http.server.SimpleHTTPRequestHandler):
    """Handler com CORS habilitado para permitir carregamento cross-origin."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SERVE_ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()


if __name__ == '__main__':
    print(f'Servindo arquivos de: {SERVE_ROOT}')
    print(f'URL base: http://localhost:{PORT}/PainelUnificado/')
    print(f'Pressione Ctrl+C para parar.\n')

    with http.server.HTTPServer(('', PORT), CORSHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServidor encerrado.')
