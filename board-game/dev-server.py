#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
MATRIX_PATH = os.path.join(ROOT_DIR, "damage-matrix.md")
API_PATH = "/api/damage-matrix"
MAX_BODY_BYTES = 512 * 1024
UPDATE_SCRIPT_PATH = os.path.join(ROOT_DIR, "update_damage_matrix_md.py")

MD_JSON_BLOCK_RE = re.compile(
  r"<!--\\s*BEGIN_DAMAGE_MATRIX_JSON\\s*-->[\\s\\S]*?```json\\s*(?P<json>[\\s\\S]*?)\\s*```[\\s\\S]*?<!--\\s*END_DAMAGE_MATRIX_JSON\\s*-->",
  re.MULTILINE,
)


def _extract_json_from_markdown(text: str):
  match = MD_JSON_BLOCK_RE.search(text)
  if not match:
    raise ValueError("No JSON block found in damage-matrix.md")
  return json.loads(match.group("json"))


class Handler(SimpleHTTPRequestHandler):
  def _send_json(self, status: int, data) -> None:
    body = json.dumps(data, indent=2).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "application/json; charset=utf-8")
    self.send_header("Content-Length", str(len(body)))
    self.end_headers()
    self.wfile.write(body)

  def _send_text(self, status: int, text: str) -> None:
    body = text.encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "text/plain; charset=utf-8")
    self.send_header("Content-Length", str(len(body)))
    self.end_headers()
    self.wfile.write(body)

  def do_GET(self) -> None:  # noqa: N802
    if self.path == API_PATH:
      try:
        with open(MATRIX_PATH, "r", encoding="utf-8") as f:
          md = f.read()
        data = _extract_json_from_markdown(md)
        self._send_json(HTTPStatus.OK, data)
      except FileNotFoundError:
        self._send_json(HTTPStatus.NOT_FOUND, {"error": "damage-matrix.md not found"})
      except (json.JSONDecodeError, ValueError):
        self._send_json(HTTPStatus.BAD_REQUEST, {"error": "damage-matrix.md is invalid"})
      except Exception as exc:  # pylint: disable=broad-except
        self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})
      return

    return super().do_GET()

  def do_POST(self) -> None:  # noqa: N802
    if self.path != API_PATH:
      self._send_text(HTTPStatus.NOT_FOUND, "Not found")
      return

    try:
      length = int(self.headers.get("Content-Length", "0"))
    except ValueError:
      self._send_text(HTTPStatus.BAD_REQUEST, "Invalid Content-Length")
      return

    if length <= 0:
      self._send_text(HTTPStatus.BAD_REQUEST, "Empty body")
      return
    if length > MAX_BODY_BYTES:
      self._send_text(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Body too large")
      return

    raw = self.rfile.read(length)
    try:
      data = json.loads(raw.decode("utf-8"))
    except Exception:  # pylint: disable=broad-except
      self._send_text(HTTPStatus.BAD_REQUEST, "Invalid JSON")
      return

    try:
      proc = subprocess.run(
        [sys.executable, UPDATE_SCRIPT_PATH, "--output", MATRIX_PATH],
        input=json.dumps(data).encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
      )
      if proc.returncode != 0:
        detail = (proc.stderr.decode("utf-8", errors="replace") or "Failed to update damage-matrix.md").strip()
        self._send_json(HTTPStatus.BAD_REQUEST, {"error": detail})
        return
    except Exception as exc:  # pylint: disable=broad-except
      self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})
      return

    self._send_json(HTTPStatus.OK, {"ok": True})


def main() -> None:
  addr = ("127.0.0.1", 8000)
  httpd = ThreadingHTTPServer(addr, Handler)
  print(f"Serving {ROOT_DIR} at http://{addr[0]}:{addr[1]}")
  print(f"Damage matrix API: http://{addr[0]}:{addr[1]}{API_PATH}")
  try:
    httpd.serve_forever()
  except KeyboardInterrupt:
    pass


if __name__ == "__main__":
  main()
