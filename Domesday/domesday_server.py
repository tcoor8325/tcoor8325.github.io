#!/usr/bin/env python3
"""Local server for Domesday static pages and CSV-linking API."""

from __future__ import annotations

import argparse
import json
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from link_transactions import link_transactions

THIS_DIR = Path(__file__).resolve().parent
SITE_ROOT = THIS_DIR.parent
DOMESDAY_CSV = THIS_DIR / "Domesday.csv"


class DomesdayHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE_ROOT), **kwargs)

    def do_POST(self) -> None:  # noqa: N802
        parsed_path = urlparse(self.path)
        if parsed_path.path == "/api/link-transactions":
            self._handle_link_transactions()
            return
        self.send_error(404, "Unknown API route")

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict:
        try:
            raw_length = self.headers.get("Content-Length", "0")
            content_length = int(raw_length)
        except ValueError as err:
            raise ValueError("Invalid Content-Length header.") from err

        if content_length <= 0:
            raise ValueError("Missing request body.")

        raw_body = self.rfile.read(content_length)
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError as err:
            raise ValueError("Request body must be valid JSON.") from err

        if not isinstance(payload, dict):
            raise ValueError("JSON body must be an object.")
        return payload

    def _handle_link_transactions(self) -> None:
        try:
            payload = self._read_json_body()
            csv_text = payload.get("csvText", "")
            filename = payload.get("filename", "uploaded_transactions.csv")
            mode = payload.get("mode", "add")

            if not isinstance(csv_text, str) or not csv_text.strip():
                raise ValueError("csvText is required.")
            if not isinstance(filename, str):
                raise ValueError("filename must be a string.")
            if mode not in {"add", "set"}:
                raise ValueError("mode must be 'add' or 'set'.")

            with tempfile.NamedTemporaryFile(
                mode="w",
                delete=False,
                dir=THIS_DIR,
                suffix=".csv",
                prefix="uploaded_",
                encoding="utf-8",
                newline="",
            ) as temp_file:
                temp_file.write(csv_text)
                temp_path = Path(temp_file.name)

            try:
                result = link_transactions(
                    transactions_csv=temp_path,
                    domesday_csv=DOMESDAY_CSV,
                    output_csv=DOMESDAY_CSV,
                    mode=mode,
                )
            finally:
                temp_path.unlink(missing_ok=True)

            result["source_filename"] = filename
            self._send_json(200, result)
        except Exception as err:  # noqa: BLE001
            self._send_json(
                400,
                {
                    "ok": False,
                    "error": str(err),
                },
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Serve the portfolio site with Domesday CSV-linking API."
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    server = ThreadingHTTPServer((args.host, args.port), DomesdayHandler)
    print(f"Serving portfolio at http://{args.host}:{args.port}/index.html")
    print(f"Domesday page: http://{args.host}:{args.port}/Domesday/index.html")
    print(f"API route: http://{args.host}:{args.port}/api/link-transactions")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
