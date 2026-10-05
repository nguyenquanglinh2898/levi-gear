#!/usr/bin/env python3
"""Check SVG design files against the levi-design rules.

Usage: check-svg.py <file.svg|folder> [...]

Prints one line per problem and exits 1 when any file has one. Standard library only.
"""
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SVG = "{http://www.w3.org/2000/svg}"
XLINK_HREF = "{http://www.w3.org/1999/xlink}href"
FORBIDDEN = {"script", "foreignObject", "iframe", "audio", "video", "animate", "animateTransform", "set"}


def local(tag):
    return tag.split("}", 1)[-1] if isinstance(tag, str) else ""


def check(path):
    problems = []
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as e:
        return [f"not well-formed XML: {e}"]

    if root.tag != SVG + "svg":
        problems.append("root element is not <svg xmlns=\"http://www.w3.org/2000/svg\">")
    if not root.get("viewBox"):
        problems.append("<svg> has no viewBox")
    if not any(local(c.tag) == "title" for c in root):
        problems.append("<svg> has no <title> as a direct child")

    ids = set()
    for el in root.iter():
        name = local(el.tag)
        if name in FORBIDDEN:
            problems.append(f"<{name}> is not allowed")
        if name == "image":
            problems.append("<image> is not allowed: draw it as vector shapes or a labeled placeholder")
        href = el.get("href") or el.get(XLINK_HREF) or ""
        if href and not href.startswith("#"):
            problems.append(f"<{name}> references something outside the file: {href[:60]}")
        if any(a.startswith("on") for a in el.attrib):
            problems.append(f"<{name}> has an event handler attribute")
        i = el.get("id")
        if i:
            if i in ids:
                problems.append(f"duplicate id \"{i}\"")
            ids.add(i)
        if name == "style" and el.text and re.search(r"@import|url\(\s*['\"]?(https?:|//|data:)", el.text):
            problems.append("<style> loads an external resource")
    return problems


def main(args):
    files = []
    for a in args:
        p = Path(a)
        files += sorted(p.rglob("*.svg")) if p.is_dir() else [p]
    if not files:
        print("no SVG files given", file=sys.stderr)
        return 2
    bad = 0
    for f in files:
        problems = check(f)
        for msg in problems:
            print(f"{f}: {msg}")
        bad += bool(problems)
    print(f"{len(files)} file(s) checked, {bad} with problems")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
