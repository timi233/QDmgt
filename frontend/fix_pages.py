#!/usr/bin/env python3
"""
One-pass fixer for corrupted TSX files under src/pages.

The script:
1. Restores try/catch/finally blocks by inserting the missing closing braces
   that batch edits stripped from the try body.
2. Normalises axios calls so dangling/empty config objects are removed
   and parentheses line up again.
3. Strips orphaned closing parentheses/brackets left behind by the failed
   replacements.

Run it from the repository root:  python scripts/fix_pages.py
"""

from __future__ import annotations

import math
import re
from pathlib import Path
from typing import List, Tuple

AXIOS_PATTERN = re.compile(r"axios\.(get|post|put|delete|patch)\s*\(")
COMMENT_PATTERN = re.compile(r"//.*?$|/\*.*?\*/", re.MULTILINE | re.DOTALL)


def sanitize_text(text: str) -> str:
    chars = list(text)
    i = 0
    in_single = False
    in_multi = False
    in_string: str | None = None
    escape = False

    while i < len(chars):
        ch = chars[i]
        if in_string:
            chars[i] = " "
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == in_string:
                in_string = None
            i += 1
            continue
        if in_single:
            chars[i] = " "
            if ch == "\n":
                in_single = False
            i += 1
            continue
        if in_multi:
            chars[i] = " "
            if ch == "*" and i + 1 < len(chars) and chars[i + 1] == "/":
                chars[i + 1] = " "
                in_multi = False
                i += 2
            else:
                i += 1
            continue
        if ch == "/" and i + 1 < len(chars):
            nxt = chars[i + 1]
            if nxt == "/":
                chars[i] = chars[i + 1] = " "
                in_single = True
                i += 2
                continue
            if nxt == "*":
                chars[i] = chars[i + 1] = " "
                in_multi = True
                i += 2
                continue
        if ch in ('"', "'", "`"):
            chars[i] = " "
            in_string = ch
        i += 1
    return "".join(chars)


def is_word_at(text: str, idx: int, word: str) -> bool:
    end = idx + len(word)
    if end > len(text) or not text.startswith(word, idx):
        return False
    left_ok = idx == 0 or not (text[idx - 1].isalnum() or text[idx - 1] == "_")
    right_ok = end == len(text) or not (text[end].isalnum() or text[end] == "_")
    return left_ok and right_ok


def detect_indent_unit(text: str) -> str:
    if any(line.startswith("\t") for line in text.splitlines()):
        return "\t"
    lengths: List[int] = []
    for line in text.splitlines():
        stripped = line.lstrip()
        if not stripped:
            continue
        indent_len = len(line) - len(stripped)
        if indent_len:
            lengths.append(indent_len)
    if not lengths:
        return "  "
    unit = lengths[0]
    for length in lengths[1:]:
        unit = math.gcd(unit, length)
        if unit == 1:
            break
    unit = max(1, min(unit, 4))
    return " " * unit


def find_last_indent(text: str, start: int, end: int) -> str:
    segment = text[start:end]
    for line in reversed(segment.splitlines()):
        stripped = line.strip()
        if stripped:
            return line[: len(line) - len(stripped)]
    line_start = text.rfind("\n", 0, start)
    if line_start == -1:
        return ""
    prefix = text[line_start + 1 : start]
    return prefix[: len(prefix) - len(prefix.lstrip(" \t"))]


def build_missing_braces(
    text: str, block_start: int, insert_pos: int, count: int, indent_unit: str
) -> str:
    inner_indent = find_last_indent(text, block_start, insert_pos)
    indent = inner_indent
    pieces: List[str] = []
    if insert_pos > 0 and text[insert_pos - 1] not in "\r\n":
        pieces.append("\n")
    for _ in range(count):
        if indent.endswith(indent_unit):
            indent = indent[: -len(indent_unit)]
        elif indent:
            indent = ""
        pieces.append(f"{indent}"+"}")
        pieces.append("\n")
    return "".join(pieces)


def apply_try_balance(
    active: List[dict[str, int]],
    text: str,
    sanitized: str,
    handler_index: int,
    keyword_len: int,
    indent_unit: str,
    fixes: int,
) -> Tuple[str, str, int, int]:
    if not active:
        return text, sanitized, handler_index + keyword_len, fixes
    ctx = active.pop()
    block_start = ctx["content_start"]
    block_end = handler_index
    block = sanitized[block_start:block_end]
    trimmed = block.rstrip()
    insert_anchor = block_end - (len(block) - len(trimmed))
    if trimmed.endswith("}"):
        trimmed = trimmed[:-1]
        insert_anchor -= 1
    diff = trimmed.count("{") - trimmed.count("}")
    if diff > 0:
        addition = build_missing_braces(text, block_start, insert_anchor, diff, indent_unit)
        text = text[:insert_anchor] + addition + text[insert_anchor:]
        sanitized = sanitized[:insert_anchor] + " " * len(addition) + sanitized[insert_anchor:]
        handler_index += len(addition)
        fixes += diff
    return text, sanitized, handler_index + keyword_len, fixes


def fix_try_blocks(text: str, indent_unit: str) -> Tuple[str, int]:
    sanitized = sanitize_text(text)
    pending_try = False
    active: List[dict[str, int]] = []
    i = 0
    fixes = 0

    while i < len(sanitized):
        if is_word_at(sanitized, i, "try"):
            pending_try = True
            i += 3
            continue
        if sanitized[i] == "{":
            if pending_try:
                active.append({"content_start": i + 1})
                pending_try = False
            i += 1
            continue
        if is_word_at(sanitized, i, "catch"):
            text, sanitized, i, fixes = apply_try_balance(
                active, text, sanitized, i, len("catch"), indent_unit, fixes
            )
            continue
        if is_word_at(sanitized, i, "finally"):
            text, sanitized, i, fixes = apply_try_balance(
                active, text, sanitized, i, len("finally"), indent_unit, fixes
            )
            continue
        if pending_try and not sanitized[i].isspace():
            pending_try = False
        i += 1

    return text, fixes


def find_closing_paren(text: str, start: int) -> int | None:
    depth = 1
    i = start
    in_string: str | None = None
    escape = False
    in_single = False
    in_multi = False

    while i < len(text):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == in_string:
                in_string = None
            i += 1
            continue
        if in_single:
            if ch == "\n":
                in_single = False
            i += 1
            continue
        if in_multi:
            if ch == "*" and i + 1 < len(text) and text[i + 1] == "/":
                in_multi = False
                i += 2
            else:
                i += 1
            continue
        if ch == "/" and i + 1 < len(text):
            nxt = text[i + 1]
            if nxt == "/":
                in_single = True
                i += 2
                continue
            if nxt == "*":
                in_multi = True
                i += 2
                continue
        if ch in ('"', "'", "`"):
            in_string = ch
            i += 1
            continue
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return None


def split_arguments(text: str, start: int, end: int) -> List[Tuple[int, int]]:
    args: List[Tuple[int, int]] = []
    arg_start = start
    i = start
    paren = brace = bracket = 0
    in_string: str | None = None
    escape = False
    in_single = False
    in_multi = False

    while i < end:
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == in_string:
                in_string = None
            i += 1
            continue
        if in_single:
            if ch == "\n":
                in_single = False
            i += 1
            continue
        if in_multi:
            if ch == "*" and i + 1 < end and text[i + 1] == "/":
                in_multi = False
                i += 2
            else:
                i += 1
            continue
        if ch == "/" and i + 1 < end:
            nxt = text[i + 1]
            if nxt == "/":
                in_single = True
                i += 2
                continue
            if nxt == "*":
                in_multi = True
                i += 2
                continue
        if ch in ('"', "'", "`"):
            in_string = ch
            i += 1
            continue
        if ch == "(":
            paren += 1
        elif ch == ")":
            if paren > 0:
                paren -= 1
        elif ch == "{":
            brace += 1
        elif ch == "}":
            if brace > 0:
                brace -= 1
        elif ch == "[":
            bracket += 1
        elif ch == "]":
            if bracket > 0:
                bracket -= 1
        elif ch == "," and paren == 0 and brace == 0 and bracket == 0:
            args.append((arg_start, i))
            arg_start = i + 1
        i += 1
    args.append((arg_start, end))
    return args


def strip_comments(value: str) -> str:
    return COMMENT_PATTERN.sub("", value)


def is_empty_config(arg_text: str) -> bool:
    cleaned = strip_comments(arg_text).strip()
    if not cleaned:
        return True
    no_braces = cleaned.replace("{", "").replace("}", "").strip()
    return not no_braces


def remove_argument_segment(text: str, start: int, end: int) -> Tuple[str, int]:
    removal_start = start
    while removal_start > 0 and text[removal_start - 1].isspace():
        removal_start -= 1
    if removal_start > 0 and text[removal_start - 1] == ",":
        removal_start -= 1
        while removal_start > 0 and text[removal_start - 1].isspace():
            removal_start -= 1
    new_text = text[:removal_start] + text[end:]
    return new_text, end - removal_start


def clean_axios_calls(text: str) -> Tuple[str, int]:
    fixes = 0
    offset = 0
    while True:
        match = AXIOS_PATTERN.search(text, offset)
        if not match:
            break
        args_start = match.end()
        closing = find_closing_paren(text, args_start)
        if closing is None:
            offset = args_start
            continue
        arg_ranges = split_arguments(text, args_start, closing - 1)
        removals: List[Tuple[int, int]] = []
        for start, end in reversed(arg_ranges):
            arg_text = text[start:end].strip()
            if not arg_text or is_empty_config(arg_text):
                removals.append((start, end))
            else:
                break
        if not removals:
            offset = closing
            continue
        for start, end in removals:
            text, removed = remove_argument_segment(text, start, end)
            closing -= removed
            fixes += 1
        offset = closing
    return text, fixes


def remove_orphaned_parentheses(text: str) -> Tuple[str, int]:
    result: List[str] = []
    paren = bracket = 0
    in_string: str | None = None
    escape = False
    in_single = False
    in_multi = False
    removed = 0
    i = 0

    while i < len(text):
        ch = text[i]
        if in_string:
            result.append(ch)
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == in_string:
                in_string = None
            i += 1
            continue
        if in_single:
            result.append(ch)
            if ch == "\n":
                in_single = False
            i += 1
            continue
        if in_multi:
            result.append(ch)
            if ch == "*" and i + 1 < len(text) and text[i + 1] == "/":
                result.append("/")
                i += 2
                in_multi = False
            else:
                i += 1
            continue
        if ch == "/" and i + 1 < len(text):
            nxt = text[i + 1]
            if nxt == "/":
                result.append(ch)
                result.append("/")
                i += 2
                in_single = True
                continue
            if nxt == "*":
                result.append(ch)
                result.append("*")
                i += 2
                in_multi = True
                continue
        if ch in ('"', "'", "`"):
            result.append(ch)
            in_string = ch
            i += 1
            continue
        if ch == "(":
            paren += 1
            result.append(ch)
        elif ch == ")":
            if paren > 0:
                paren -= 1
                result.append(ch)
            else:
                removed += 1
        elif ch == "[":
            bracket += 1
            result.append(ch)
        elif ch == "]":
            if bracket > 0:
                bracket -= 1
                result.append(ch)
            else:
                removed += 1
        else:
            result.append(ch)
        i += 1
    return "".join(result), removed


def process_file(path: Path) -> Tuple[int, int, int]:
    text = path.read_text(encoding="utf-8")
    indent_unit = detect_indent_unit(text)
    text, brace_fixes = fix_try_blocks(text, indent_unit)
    text, axios_fixes = clean_axios_calls(text)
    text, paren_fixes = remove_orphaned_parentheses(text)
    if brace_fixes or axios_fixes or paren_fixes:
        path.write_text(text, encoding="utf-8")
    return brace_fixes, axios_fixes, paren_fixes


def main() -> None:
    root = Path(__file__).resolve().parent
    pages_dir = root / "src" / "pages"
    if not pages_dir.exists():
        raise SystemExit(f"Cannot find {pages_dir}")
    files = sorted(pages_dir.rglob("*.tsx"))
    if not files:
        print(f"No TSX files under {pages_dir}")
        return

    total_try = total_axios = total_paren = 0
    for tsx_file in files:
        brace_fixes, axios_fixes, paren_fixes = process_file(tsx_file)
        if brace_fixes or axios_fixes or paren_fixes:
            print(
                f"{tsx_file}: +{brace_fixes} brace fixes, "
                f"+{axios_fixes} axios fixes, -{paren_fixes} orphan parens"
            )
            total_try += brace_fixes
            total_axios += axios_fixes
            total_paren += paren_fixes

    print(
        f"Done. Added {total_try} missing braces, cleaned {total_axios} axios calls, "
        f"removed {total_paren} orphan parentheses."
    )


if __name__ == "__main__":
    main()
