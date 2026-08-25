#!/usr/bin/env python3
"""
WCAG 2.1 contrast checker for the Aptos design-system token set.

Usage:
    python3 check_contrast.py                  # verify every pairing in references/tokens.json
    python3 check_contrast.py "#171612" "#F9F9F0"   # ad-hoc check of two hex colors

Exit code is non-zero if any REQUIRED pairing (see PAIRS_TO_VERIFY) fails its
target ratio. Ad-hoc two-color invocations always exit 0 (they're just a lookup).

No third-party dependencies — stdlib only, so it runs anywhere Python 3 runs.
"""

import json
import sys
from pathlib import Path

TOKENS_PATH = Path(__file__).resolve().parent.parent / "references" / "tokens.json"


def hex_to_rgb(h: str):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def _channel_linear(c: int) -> float:
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def relative_luminance(hex_color: str) -> float:
    r, g, b = hex_to_rgb(hex_color)
    return 0.2126 * _channel_linear(r) + 0.7152 * _channel_linear(g) + 0.0722 * _channel_linear(b)


def contrast_ratio(hex_a: str, hex_b: str) -> float:
    la, lb = relative_luminance(hex_a), relative_luminance(hex_b)
    lighter, darker = max(la, lb), min(la, lb)
    return (lighter + 0.05) / (darker + 0.05)


def verdict(ratio: float, large_text: bool = False) -> str:
    aa = 3.0 if large_text else 4.5
    aaa = 4.5 if large_text else 7.0
    if ratio >= aaa:
        return "AAA"
    if ratio >= aa:
        return "AA"
    return "FAIL"


# (label_fg, label_bg, fg_hex, bg_hex, large_text, required)
# `required=True` pairings must be >= AA or the script exits non-zero — these are
# the combinations the governance UI actually uses for real text.
PAIRS_TO_VERIFY = [
    ("text.primary", "canvasWarm", "#171612", "#F9F9F0", False, True),
    ("text.primary", "paper", "#171612", "#FFFFFF", False, True),
    ("text.secondary", "canvasWarm", "#2F2D28", "#F9F9F0", False, True),
    ("text.secondary", "paper", "#2F2D28", "#FFFFFF", False, True),
    ("dark.text.primary", "dark.background", "#F9F9F0", "#0F0E0B", False, True),
    ("dark.text.secondary", "dark.paper", "#EFECCA", "#171612", False, True),
    ("status.active text-on-fill", "active fill", "#171612", "#BADBEE", False, True),
    ("status.passed text-on-fill", "passed fill", "#171612", "#DAF6D4", False, True),
    ("status.executed text-on-fill", "executed fill", "#F9F9F0", "#2F2D28", False, True),
    ("status.failed text-on-fill", "failed fill", "#171612", "#FE805C", False, True),
    ("interactive.primaryInfo", "canvasWarm", "#34648F", "#F9F9F0", False, True),
    ("interactive.success", "canvasWarm", "#256B2E", "#F9F9F0", False, True),
    ("interactive.error", "canvasWarm", "#B84722", "#F9F9F0", False, True),
    ("interactive.warning", "canvasWarm", "#9D5A16", "#F9F9F0", False, True),
    # Known-bad pairing kept intentionally to prove the checker catches real failures.
    ("tan (INVALID as text)", "canvasWarm", "#9D937C", "#F9F9F0", False, False),
]


def run_full_report() -> int:
    if not TOKENS_PATH.exists():
        print(f"tokens.json not found at {TOKENS_PATH}", file=sys.stderr)
        return 2

    failures = 0
    required_failures = 0
    print(f"{'pairing':38} {'ratio':>8}  {'verdict':6}  required")
    print("-" * 70)
    for label_fg, label_bg, fg, bg, large, required in PAIRS_TO_VERIFY:
        ratio = contrast_ratio(fg, bg)
        v = verdict(ratio, large_text=large)
        flag = "REQUIRED" if required else "reference"
        line = f"{label_fg + ' / ' + label_bg:38} {ratio:7.2f}:1  {v:6}  {flag}"
        if required and v == "FAIL":
            required_failures += 1
            line += "  <-- FAILURE"
        elif not required and v == "FAIL":
            line += "  (expected fail — do not use as text)"
        print(line)
        if required and v == "FAIL":
            failures += 1

    print("-" * 70)
    if required_failures:
        print(f"{required_failures} REQUIRED pairing(s) failed WCAG AA. Fix tokens.json before shipping.")
        return 1
    print("All required pairings pass WCAG AA or better.")
    return 0


def run_adhoc(fg: str, bg: str) -> int:
    ratio = contrast_ratio(fg, bg)
    print(f"{fg} on {bg}: {ratio:.2f}:1")
    print(f"  normal text: {verdict(ratio, large_text=False)}")
    print(f"  large text (>=18pt or >=14pt bold): {verdict(ratio, large_text=True)}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) == 3:
        sys.exit(run_adhoc(sys.argv[1], sys.argv[2]))
    elif len(sys.argv) == 1:
        sys.exit(run_full_report())
    else:
        print(__doc__)
        sys.exit(2)
