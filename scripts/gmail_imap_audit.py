#!/usr/bin/env python3
import argparse
import email
import imaplib
import json
import re
import socket
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from email import policy
from email.header import decode_header
from email.utils import parsedate_to_datetime
from pathlib import Path


ACCOUNT = "coaching@achzodcoaching.com"
KEYCHAIN_SERVICE = "codex-gmail-coaching-app-password"
ALL_MAIL = '"[Gmail]/All Mail"'
SENT_MAIL = '"[Gmail]/Sent Mail"'


def keychain_password() -> str:
    return subprocess.check_output(
        [
            "security",
            "find-generic-password",
            "-s",
            KEYCHAIN_SERVICE,
            "-a",
            ACCOUNT,
            "-w",
        ],
        text=True,
    ).strip()


def decode_mime(value) -> str:
    if not value:
        return ""
    parts = []
    for chunk, enc in decode_header(str(value)):
        if isinstance(chunk, bytes):
            parts.append(chunk.decode(enc or "utf-8", errors="replace"))
        else:
            parts.append(chunk)
    return "".join(parts).strip()


def escape_raw_query(query: str) -> str:
    return '"' + query.replace("\\", "\\\\").replace('"', '\\"') + '"'


def connect():
    socket.setdefaulttimeout(25)
    conn = imaplib.IMAP4_SSL("imap.gmail.com", 993)
    conn.login(ACCOUNT, keychain_password())
    return conn


def search_raw(conn, query: str, mailbox: str = ALL_MAIL) -> list[str]:
    conn.select(mailbox, readonly=True)
    typ, data = conn.uid("SEARCH", None, "X-GM-RAW", escape_raw_query(query))
    if typ != "OK" or not data or not data[0]:
        return []
    return [uid.decode() for uid in data[0].split()]


def message_body(msg) -> str:
    chunks = []
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = (part.get("Content-Disposition") or "").lower()
            if ctype != "text/plain" or "attachment" in disp:
                continue
            try:
                chunks.append(part.get_content())
            except Exception:
                payload = part.get_payload(decode=True) or b""
                chunks.append(payload.decode(part.get_content_charset() or "utf-8", "replace"))
    else:
        try:
            chunks.append(msg.get_content())
        except Exception:
            payload = msg.get_payload(decode=True) or b""
            chunks.append(payload.decode(msg.get_content_charset() or "utf-8", "replace"))

    text = "\n".join(chunks)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def fetch_messages(conn, uids: list[str], limit: int, body_bytes: int = 0) -> list[dict]:
    out = []
    for uid in sorted(set(uids), key=lambda x: int(x), reverse=True)[:limit]:
        fetch_spec = "(RFC822.HEADER)"
        if body_bytes > 0:
            fetch_spec = (
                "(RFC822.HEADER "
                f"BODY.PEEK[TEXT]<0.{body_bytes}>)"
            )
        try:
            typ, data = conn.uid("FETCH", uid, fetch_spec)
        except Exception as exc:
            out.append(
                {
                    "uid": uid,
                    "fetch_error": f"{type(exc).__name__}: {str(exc)[:200]}",
                    "message_id": "",
                    "date_utc": "",
                    "from": "",
                    "to": "",
                    "cc": "",
                    "subject": "",
                    "snippet": "",
                    "body_length": 0,
                }
            )
            continue
        if typ != "OK":
            continue
        header_raw = b""
        text_raw = b""
        for part in data:
            if not isinstance(part, tuple):
                continue
            meta = part[0]
            if b"HEADER" in meta:
                header_raw += part[1]
            elif b"TEXT" in meta:
                text_raw += part[1]
        if not header_raw:
            continue
        msg = email.message_from_bytes(header_raw, policy=policy.default)
        date_raw = msg.get("Date")
        try:
            dt = parsedate_to_datetime(date_raw).astimezone(timezone.utc).isoformat()
        except Exception:
            dt = date_raw or ""
        body = text_raw.decode("utf-8", errors="replace") if text_raw else ""
        if body:
            body = re.sub(r"<[^>]+>", " ", body)
            body = re.sub(r"\s+", " ", body).strip()
        out.append(
            {
                "uid": uid,
                "message_id": msg.get("Message-ID", ""),
                "date_utc": dt,
                "from": decode_mime(msg.get("From")),
                "to": decode_mime(msg.get("To")),
                "cc": decode_mime(msg.get("Cc")),
                "subject": decode_mime(msg.get("Subject")),
                "snippet": body[:900],
                "body_length": len(body),
            }
        )
    return out


def summarize_hits(messages: list[dict]) -> list[dict]:
    return [
        {
            "date_utc": m["date_utc"],
            "from": m["from"],
            "to": m["to"],
            "subject": m["subject"],
            "snippet": m["snippet"][:280].replace("\n", " "),
        }
        for m in messages
    ]


def run(days: int, fetch_limit: int, body_bytes: int) -> dict:
    queries = {
        "recent_inbox": f"in:inbox newer_than:{days}d",
        "unread_inbox": f"in:inbox is:unread newer_than:{days}d",
        "recent_sent": f"in:sent newer_than:{days}d",
        "bounce_senders": f"in:anywhere newer_than:{days}d (from:mailer-daemon OR from:postmaster OR from:delivery)",
        "bounce_subjects": f"in:anywhere newer_than:{days}d (subject:undelivered OR subject:failure OR subject:returned OR subject:bounced OR subject:rejected)",
        "sendpulse": f"in:anywhere newer_than:{days}d sendpulse",
        "delivery_terms": f"in:anywhere newer_than:{days}d (smtp OR bounce OR bounced OR spam OR blocked)",
        "cta_commercial": f"in:inbox newer_than:{days}d (coaching OR formule OR diagnostic OR questionnaire OR elite OR essential OR paiement OR promo)",
        "peptides_support": f"in:inbox newer_than:{days}d (peptide OR peptides OR selank OR semax OR reta OR retatrutide OR ghk OR spray)",
        "malik_kerouani": f"in:anywhere newer_than:{days}d (from:mkerouani@hotmail.fr OR to:mkerouani@hotmail.fr)",
        "mohammad_sahebally": f"in:anywhere newer_than:{days}d (mohammad OR sahebally OR from:mohammad)",
        "simon_leveque": f"in:anywhere newer_than:{days}d (simon OR leveque)",
        "youssef_elmaftouhi": f"in:anywhere newer_than:{days}d (elmaftouhi OR youssef)",
        "goumri_mustapha": f"in:anywhere newer_than:{days}d (goumri OR mustapha)",
    }

    result = {
        "account": ACCOUNT,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "days": days,
        "queries": {},
        "cross_summary": {},
    }

    conn = connect()
    try:
        for name, query in queries.items():
            print(f"QUERY_START {name}", flush=True)
            mailbox = SENT_MAIL if name == "recent_sent" else ALL_MAIL
            try:
                uids = search_raw(conn, query, mailbox=mailbox)
                print(f"QUERY_HITS {name} {len(uids)}", flush=True)
                messages = fetch_messages(conn, uids, fetch_limit, body_bytes)
                print(f"QUERY_FETCHED {name} {len(messages)}", flush=True)
            except Exception as exc:
                uids = []
                messages = []
                print(f"QUERY_ERROR {name} {type(exc).__name__}: {str(exc)[:220]}", flush=True)
            result["queries"][name] = {
                "query": query,
                "count": len(uids),
                "fetched": len(messages),
                "messages": messages,
            }

        sender_counts = defaultdict(int)
        for m in result["queries"]["recent_inbox"]["messages"]:
            sender_counts[m["from"]] += 1
        result["cross_summary"]["top_recent_inbox_senders"] = sorted(
            sender_counts.items(), key=lambda kv: kv[1], reverse=True
        )[:20]
    finally:
        try:
            conn.logout()
        except Exception:
            pass

    return result


def main():
    parser = argparse.ArgumentParser(description="Audit Gmail coaching via IMAP without mutating mailbox state.")
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--fetch-limit", type=int, default=40)
    parser.add_argument("--body-bytes", type=int, default=0)
    parser.add_argument("--out", default="")
    args = parser.parse_args()

    result = run(args.days, args.fetch_limit, args.body_bytes)
    out = args.out or f"/tmp/gmail_coaching_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    Path(out).write_text(json.dumps(result, indent=2, ensure_ascii=False))

    print(f"AUDIT_JSON={out}")
    print(f"ACCOUNT={result['account']}")
    print(f"DAYS={result['days']}")
    for name, payload in result["queries"].items():
        print(f"{name}: count={payload['count']} fetched={payload['fetched']}")
        for msg in summarize_hits(payload["messages"][:5]):
            print(f"  - {msg['date_utc']} | {msg['from']} | {msg['subject']} | {msg['snippet']}")


if __name__ == "__main__":
    main()
