# -*- coding: utf-8 -*-
"""
Servidor estatico para desarrollo, SIN cache.

`python -m http.server` no manda cabeceras de cache, y el navegador entonces
aplica su propia heuristica: al editar css/ o js/ una recarga normal puede
seguir mostrando la version vieja. Eso hace perder tiempo persiguiendo cambios
que en realidad ya estaban aplicados.

Este servidor manda `Cache-Control: no-store` en todo, asi que cada recarga
trae los archivos frescos.

Uso:  python tools/servidor_local.py [puerto]
"""

import http.server
import os
import socketserver
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 8777


class SinCache(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=RAIZ, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, formato, *args):
        # solo los errores; el registro de cada archivo servido no aporta
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(formato, *args)


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PUERTO), SinCache) as srv:
        print(f"Sirviendo {RAIZ} en http://localhost:{PUERTO}  (sin cache)")
        srv.serve_forever()
