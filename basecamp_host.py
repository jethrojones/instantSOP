#!/usr/bin/env python3
"""
InstantSOP — Basecamp Native Messaging Host

Receives JSON messages from the Chrome extension via stdin (length-prefixed),
runs basecamp CLI commands, and returns JSON results via stdout.

Message types:
  - list-accounts: Returns Basecamp accounts
  - list-projects: Returns projects for a given account
  - publish: Uploads screenshots, creates a Docs & Files document
"""

import json
import struct
import sys
import subprocess
import tempfile
import base64
import os


def read_message():
    """Read a native messaging message from stdin."""
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) < 4:
        sys.exit(0)
    length = struct.unpack("=I", raw_length)[0]
    data = sys.stdin.buffer.read(length)
    return json.loads(data.decode("utf-8"))


def send_message(obj):
    """Send a native messaging message to stdout."""
    encoded = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("=I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


BASECAMP_BIN = os.environ.get("BASECAMP_BIN", "/Users/jethrojones/.local/bin/basecamp")


def run_basecamp(args):
    """Run a basecamp CLI command and return (ok, result_or_error)."""
    try:
        result = subprocess.run(
            [BASECAMP_BIN] + args,
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            return False, result.stderr.strip() or f"Exit code {result.returncode}"
        return True, result.stdout.strip()
    except FileNotFoundError:
        return False, "basecamp CLI not found — install with: brew install basecamp/tap/basecamp"
    except subprocess.TimeoutExpired:
        return False, "Command timed out after 30 seconds"
    except Exception as e:
        return False, str(e)


def handle_list_accounts():
    ok, output = run_basecamp(["accounts", "list", "--json", "--quiet"])
    if not ok:
        return {"ok": False, "error": output}
    try:
        accounts = json.loads(output)
        return {"ok": True, "accounts": accounts}
    except json.JSONDecodeError:
        return {"ok": False, "error": "Could not parse accounts list"}


def handle_list_projects(msg):
    account_id = msg.get("accountId")
    if not account_id:
        return {"ok": False, "error": "Missing accountId"}

    ok, output = run_basecamp(["projects", "list", "-a", str(account_id), "--json", "--quiet"])
    if not ok:
        return {"ok": False, "error": output}
    try:
        projects = json.loads(output)
        return {"ok": True, "projects": projects}
    except json.JSONDecodeError:
        return {"ok": False, "error": "Could not parse projects list"}


def handle_publish(msg):
    account_id = msg.get("accountId")
    project_id = msg.get("projectId")
    title = msg.get("title", "How-To Guide")
    steps_data = msg.get("steps", [])

    if not account_id or not project_id:
        return {"ok": False, "error": "Missing accountId or projectId"}
    if not steps_data:
        return {"ok": False, "error": "No steps provided"}

    with tempfile.TemporaryDirectory(prefix="instantsop_") as tmpdir:
        # Write screenshots to temp files
        screenshot_paths = []
        for i, step in enumerate(steps_data):
            b64 = step.get("screenshot_base64", "")
            if not b64:
                screenshot_paths.append(None)
                continue
            # Strip data URL prefix if present
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            path = os.path.join(tmpdir, f"step-{i + 1}.png")
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            screenshot_paths.append(path)

        # Upload all screenshots in one batch
        paths_to_upload = [p for p in screenshot_paths if p]
        sgid_map = {}  # path -> sgid html

        if paths_to_upload:
            ok, output = run_basecamp(
                ["attach"] + paths_to_upload + ["-a", str(account_id), "--json", "--quiet"]
            )
            if not ok:
                return {"ok": False, "error": f"Failed to upload screenshots: {output}"}
            try:
                attachments = json.loads(output)
                # attachments is a list of objects with "attachable_sgid" and filename
                if isinstance(attachments, list):
                    for att in attachments:
                        sgid = att.get("attachable_sgid", "")
                        filename = att.get("filename", "")
                        # Match back to our paths by filename
                        for p in paths_to_upload:
                            if os.path.basename(p) == filename:
                                sgid_map[p] = sgid
                                break
                elif isinstance(attachments, dict):
                    # Single attachment
                    sgid = attachments.get("attachable_sgid", "")
                    if sgid and paths_to_upload:
                        sgid_map[paths_to_upload[0]] = sgid
            except json.JSONDecodeError:
                return {"ok": False, "error": "Could not parse attachment response"}

        # Build HTML body
        html_parts = []
        for i, step in enumerate(steps_data):
            desc = step.get("description", f"Step {i + 1}")
            notes = step.get("notes", "")

            html_parts.append(f"<h2>Step {i + 1}: {desc}</h2>")
            if notes:
                html_parts.append(f"<p>{notes}</p>")

            path = screenshot_paths[i]
            if path and path in sgid_map:
                sgid = sgid_map[path]
                html_parts.append(f'<bc-attachment sgid="{sgid}" content-type="image/png"></bc-attachment>')

        body_html = "\n".join(html_parts)

        # Create document in Docs & Files
        ok, output = run_basecamp([
            "docs", "documents", "create",
            title, body_html,
            "-a", str(account_id),
            "-p", str(project_id),
            "--json",
        ])
        if not ok:
            return {"ok": False, "error": f"Failed to create document: {output}"}

        try:
            doc = json.loads(output)
            url = doc.get("app_url", "")
            return {"ok": True, "url": url}
        except json.JSONDecodeError:
            # Document was probably created but response wasn't JSON
            return {"ok": True, "url": ""}


def main():
    while True:
        try:
            msg = read_message()
        except Exception:
            break

        msg_type = msg.get("type", "")

        if msg_type == "list-accounts":
            result = handle_list_accounts()
        elif msg_type == "list-projects":
            result = handle_list_projects(msg)
        elif msg_type == "publish":
            result = handle_publish(msg)
        else:
            result = {"ok": False, "error": f"Unknown message type: {msg_type}"}

        send_message(result)


if __name__ == "__main__":
    main()
