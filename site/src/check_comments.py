#!/usr/bin/env python3
"""Check or remove comments in web frontend sources."""

import sys
from pathlib import Path

EXTENSIONS = {
    ".js": "js",
    ".mjs": "js",
    ".cjs": "js",
    ".jsx": "js",
    ".ts": "js",
    ".tsx": "js",
    ".css": "css",
    ".scss": "scss",
    ".less": "scss",
    ".html": "html",
    ".htm": "html",
    ".svg": "html",
    ".vue": "html",
}
SKIP_DIRS = {"node_modules", "dist", ".dist-staging", ".dist-previous", "vendor", ".git"}
KEYWORDS = {
    "return", "typeof", "case", "throw", "void", "delete", "do", "else",
    "yield", "await", "of", "in", "instanceof",
}


def read_quoted(text, index, quote):
    cursor = index + 1
    while cursor < len(text):
        if text[cursor] == "\\":
            cursor += 2
            continue
        if text[cursor] == quote:
            return text[index:cursor + 1], cursor + 1
        if text[cursor] == "\n":
            break
        cursor += 1
    return text[index:cursor], cursor


def read_regex(text, index):
    cursor = index + 1
    in_class = False
    while cursor < len(text):
        if text[cursor] == "\\":
            cursor += 2
            continue
        if text[cursor] == "[":
            in_class = True
        elif text[cursor] == "]":
            in_class = False
        elif text[cursor] == "/" and not in_class:
            cursor += 1
            while cursor < len(text) and text[cursor].isalpha():
                cursor += 1
            return text[index:cursor], cursor
        elif text[cursor] == "\n":
            break
        cursor += 1
    return text[index:cursor], cursor


def scan_js(text, index, expect_regex, stop_brace=False):
    out = []
    comments = []
    depth = 0
    length = len(text)
    while index < length:
        char = text[index]
        nxt = text[index + 1] if index + 1 < length else ""
        if char in " \t\r\n":
            out.append(char)
            index += 1
            continue
        if char == "/" and nxt == "/":
            start = index
            index += 2
            while index < length and text[index] != "\n":
                index += 1
            comments.append((start, text[start:index]))
            expect_regex = True
            continue
        if char == "/" and nxt == "*":
            start = index
            index += 2
            while index + 1 < length and not (text[index] == "*" and text[index + 1] == "/"):
                index += 1
            index = min(length, index + 2)
            comments.append((start, text[start:index]))
            expect_regex = True
            continue
        if char in "'\"":
            literal, index = read_quoted(text, index, char)
            out.append(literal)
            expect_regex = False
            continue
        if char == "`":
            literal, index, nested = read_template(text, index)
            out.append(literal)
            comments.extend(nested)
            expect_regex = False
            continue
        if char == "/" and expect_regex:
            literal, index = read_regex(text, index)
            out.append(literal)
            expect_regex = False
            continue
        if char.isalpha() or char in "_$":
            cursor = index + 1
            while cursor < length and (text[cursor].isalnum() or text[cursor] in "_$"):
                cursor += 1
            word = text[index:cursor]
            out.append(word)
            expect_regex = word in KEYWORDS
            index = cursor
            continue
        if char.isdigit():
            cursor = index + 1
            while cursor < length and (text[cursor].isalnum() or text[cursor] in "._"):
                cursor += 1
            out.append(text[index:cursor])
            expect_regex = False
            index = cursor
            continue
        if char == "{":
            depth += 1
            out.append(char)
            expect_regex = True
            index += 1
            continue
        if char == "}":
            if stop_brace and depth == 0:
                return out, comments, index, expect_regex
            depth = max(0, depth - 1)
            out.append(char)
            expect_regex = False
            index += 1
            continue
        out.append(char)
        if char in "([:;,?~^":
            expect_regex = True
        elif char in "+-*%&|<>!=":
            expect_regex = True
        elif char in ")]":
            expect_regex = False
        else:
            expect_regex = False
        index += 1
    return out, comments, index, expect_regex


def read_template(text, index):
    parts = ["`"]
    comments = []
    index += 1
    length = len(text)
    while index < length:
        char = text[index]
        if char == "\\":
            parts.append(text[index:index + 2])
            index += 2
            continue
        if char == "`":
            parts.append("`")
            return "".join(parts), index + 1, comments
        if char == "$" and index + 1 < length and text[index + 1] == "{":
            parts.append("${")
            inner, nested, index, _expect = scan_js(text, index + 2, True, stop_brace=True)
            parts.append("".join(inner))
            comments.extend(nested)
            if index < length and text[index] == "}":
                parts.append("}")
                index += 1
            continue
        parts.append(char)
        index += 1
    return "".join(parts), index, comments


def strip_js(text):
    out, comments, _index, _expect = scan_js(text, 0, True)
    return "".join(out), comments


def strip_css(text, line_comments=False):
    out = []
    comments = []
    index = 0
    length = len(text)
    while index < length:
        char = text[index]
        if char in "'\"":
            literal, index = read_quoted(text, index, char)
            out.append(literal)
            continue
        if text.startswith("/*", index):
            end = text.find("*/", index + 2)
            if end == -1:
                comments.append((index, text[index:]))
                break
            comments.append((index, text[index:end + 2]))
            index = end + 2
            continue
        if line_comments and text.startswith("//", index) and not (index > 0 and text[index - 1] == ":"):
            start = index
            while index < length and text[index] != "\n":
                index += 1
            comments.append((start, text[start:index]))
            continue
        out.append(char)
        index += 1
    return "".join(out), comments


def shift(comments, offset):
    return [(index + offset, snippet) for index, snippet in comments]


def strip_html(text):
    out = []
    comments = []
    index = 0
    length = len(text)
    lower = text.lower()
    while index < length:
        if text.startswith("<!--", index):
            end = text.find("-->", index + 4)
            if end == -1:
                comments.append((index, text[index:]))
                break
            comments.append((index, text[index:end + 3]))
            index = end + 3
            continue
        kind = None
        if lower.startswith("<script", index) and not lower[index + 7:index + 8].isalpha():
            kind = "js"
            closer = "</script"
        elif lower.startswith("<style", index) and not lower[index + 6:index + 7].isalpha():
            kind = "css"
            closer = "</style"
        if kind:
            tag_end = text.find(">", index)
            if tag_end == -1:
                out.append(text[index:])
                break
            close = lower.find(closer, tag_end)
            if close == -1:
                body = text[tag_end + 1:]
                close_tag = ""
                next_index = length
            else:
                body = text[tag_end + 1:close]
                close_end = text.find(">", close)
                close_end = length if close_end == -1 else close_end + 1
                close_tag = text[close:close_end]
                next_index = close_end
            if kind == "js":
                stripped, found = strip_js(body)
            else:
                stripped, found = strip_css(body)
            comments.extend(shift(found, tag_end + 1))
            out.append(text[index:tag_end + 1] + stripped + close_tag)
            index = next_index
            continue
        out.append(text[index])
        index += 1
    return "".join(out), comments


STRIPS = {
    "js": strip_js,
    "css": strip_css,
    "scss": lambda text: strip_css(text, line_comments=True),
    "html": strip_html,
}


def line_of(text, index):
    return text.count("\n", 0, index) + 1


def iter_files(paths):
    for raw in paths:
        path = Path(raw)
        if path.is_file() and path.suffix.lower() in EXTENSIONS:
            yield path
            continue
        if not path.is_dir():
            continue
        for file in path.rglob("*"):
            if not file.is_file() or file.suffix.lower() not in EXTENSIONS:
                continue
            if any(part in SKIP_DIRS for part in file.parts):
                continue
            yield file


def process(path, fix):
    original = path.read_text(encoding="utf-8")
    updated, comments = STRIPS[EXTENSIONS[path.suffix.lower()]](original)
    if fix and updated != original:
        path.write_text(updated, encoding="utf-8")
    return original, comments


def report(path, original, comments):
    for index, snippet in comments:
        preview = " ".join(snippet.split())
        if len(preview) > 80:
            preview = preview[:77] + "..."
        print(f"{path}:{line_of(original, index)}: {preview}")


def self_test():
    cases = [
        ("js", "const a = 1; // hi\nconst b = 2;", "const a = 1; \nconst b = 2;"),
        ("js", 'const url = "https://example.com";', 'const url = "https://example.com";'),
        ("js", "const re = /https:\\/\\//;", "const re = /https:\\/\\//;"),
        ("js", "const n = a / b;", "const n = a / b;"),
        ("js", "/* block */\nconst a = 1;", "\nconst a = 1;"),
        ("js", "const s = `keep ${name} // inside`;", "const s = `keep ${name} // inside`;"),
        ("js", "const s = `a ${1 // c\n} end`;", "const s = `a ${1 \n} end`;"),
        ("css", "a{color:red}/* x */", "a{color:red}"),
        ("css", "a{background:url(https://cdn.example/a.png)}", "a{background:url(https://cdn.example/a.png)}"),
        ("html", "<!-- n --><p>hi</p>", "<p>hi</p>"),
        ("html", '<svg xmlns="http://www.w3.org/2000/svg"></svg>', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
        ("html", "<script>const a = 1; // z\n</script>", "<script>const a = 1; \n</script>"),
    ]
    failed = 0
    for kind, source, expected in cases:
        updated, comments = STRIPS[kind](source)
        if updated != expected:
            failed += 1
            print("mismatch")
            print(" source  ", source)
            print(" updated ", updated)
            print(" expected", expected)
        if kind != "js" or "https://example.com" in source or "url(" in source:
            continue
    return failed == 0


def main(argv):
    if "--self-test" in argv:
        if self_test():
            print("comment checker self-test passed")
            return 0
        print("comment checker self-test failed")
        return 1
    fix = "--fix" in argv
    check = "--check" in argv or not fix
    paths = [arg for arg in argv if not arg.startswith("--")]
    if not paths:
        print("usage: check_comments.py --check|--fix|--self-test [paths]")
        return 2
    total = 0
    for path in iter_files(paths):
        original, comments = process(path, fix)
        if comments:
            report(path, original, comments)
            total += len(comments)
    if total and check and not fix:
        print(f"found {total} comment(s)")
        return 1
    if total and fix:
        print(f"removed {total} comment(s)")
    elif check:
        print("no frontend comments")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
