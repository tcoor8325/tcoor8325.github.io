#!/usr/bin/env python3
"""Serve the notebook and save recipes directly to its text library. Standard library only."""
import argparse
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
from pathlib import Path
import tempfile
import threading
from urllib.parse import unquote, urlsplit

PROJECT = Path(__file__).resolve().parents[1]
REPOSITORY = PROJECT.parent
API_PATH = '/Ingredients Analyzer/api/recipes'
LOCK = threading.Lock()
MAX_BODY = 2 * 1024 * 1024


def valid_recipe(item):
    if not isinstance(item, dict):
        return False
    servings = item.get('servings')
    if (not isinstance(servings, (int, float)) or isinstance(servings, bool)
            or not math.isfinite(servings) or servings <= 0):
        return False
    if not all(isinstance(item.get(key), str) for key in ('id', 'title', 'updatedAt')) or not item['id']:
        return False
    try:
        datetime.fromisoformat(item['updatedAt'].replace('Z', '+00:00'))
    except ValueError:
        return False
    ingredients = item.get('ingredients')
    if not isinstance(ingredients, list) or not all(
        isinstance(i, dict) and all(isinstance(i.get(k), str) for k in ('name', 'quantity', 'unit'))
        for i in ingredients
    ):
        return False
    return all(isinstance(item.get(key), list) and all(isinstance(s, str) for s in item[key])
               for key in ('preparation', 'cooking'))


def read_library(path):
    library = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(library, list) or not all(valid_recipe(item) for item in library):
        raise ValueError('recipes.txt contains invalid recipe data; repair it before saving.')
    if len({item['id'] for item in library}) != len(library):
        raise ValueError('recipes.txt contains duplicate recipe IDs.')
    return library


def write_library(path, library):
    # Replace only after the full file has reached disk; failed writes preserve the old file.
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent,
                                         prefix='.recipes-', delete=False) as output:
            temp_path = Path(output.name)
            json.dump(library, output, ensure_ascii=False, indent=2, allow_nan=False)
            output.write('\n')
            output.flush()
            os.fsync(output.fileno())
        os.replace(temp_path, path)
    finally:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink()


class RecipeHandler(SimpleHTTPRequestHandler):
    def is_api(self):
        return unquote(urlsplit(self.path).path).rstrip('/') == API_PATH

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False, allow_nan=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Recipe-Server', '1')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self.is_api():
            return super().do_GET()
        try:
            with LOCK:
                library = read_library(self.server.library_path)
            self.send_json(200, library)
        except (OSError, ValueError) as error:
            self.send_json(500, {'error': str(error)})

    def do_POST(self):
        if not self.is_api():
            return self.send_json(404, {'error': 'Unknown endpoint.'})
        # Writes are available only through the loopback server, from its own origin.
        host = self.headers.get('Host', '')
        origin = self.headers.get('Origin')
        allowed_hosts = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
        if host not in allowed_hosts or (origin is not None and origin != f'http://{host}'):
            return self.send_json(403, {'error': 'Save from this local server only.'})
        if self.headers.get('Content-Type', '').split(';')[0].strip() != 'application/json':
            return self.send_json(415, {'error': 'Expected application/json.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= MAX_BODY:
                return self.send_json(413, {'error': 'Recipe request is empty or too large.'})
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict) or not valid_recipe(data.get('recipe')):
                return self.send_json(400, {'error': 'Invalid recipe.'})
            recipe = data['recipe']
            with LOCK:
                library = read_library(self.server.library_path)
                existing = next((item for item in library if item['id'] == recipe['id']), None)
                if data.get('expectedUpdatedAt') != (existing['updatedAt'] if existing else None):
                    return self.send_json(409, {'error': 'This recipe changed on disk. Reload it before saving your edits.'})
                library = [item for item in library if item['id'] != recipe['id']] + [recipe]
                write_library(self.server.library_path, library)
            self.send_json(200, library)
        except (UnicodeError, ValueError) as error:
            self.send_json(400, {'error': str(error)})
        except OSError as error:
            self.send_json(500, {'error': f'Could not save recipes.txt: {error}'})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4189)
    args = parser.parse_args()
    handler = partial(RecipeHandler, directory=str(REPOSITORY))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    server.library_path = PROJECT / 'recipes.txt'
    print(f'Recipe Notebook: http://127.0.0.1:{server.server_port}/Ingredients%20Analyzer/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
