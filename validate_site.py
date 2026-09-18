"""Fail the build when a page has missing or duplicate MathJax loaders."""

from pathlib import Path
import re


PAGES = (
    "index.html",
    "publications.html",
    "publications-by-year.html",
    "talks.html",
    "others.html",
    "ai-in-maths.html",
)
MATHJAX_ID = re.compile(r'<script\b[^>]*\bid=["\']MathJax-script["\']', re.IGNORECASE)
PINNED_BUNDLE = "https://cdn.jsdelivr.net/npm/mathjax@4.0.0/tex-chtml.js"


def main() -> None:
    errors = []

    for filename in PAGES:
        html = Path(filename).read_text(encoding="utf-8")
        has_tex = r"\(" in html or r"\[" in html
        loader_count = len(MATHJAX_ID.findall(html))

        expected = 1 if has_tex else 0
        if loader_count != expected:
            errors.append(
                f"{filename}: expected {expected} MathJax loader(s), found {loader_count}"
            )
        elif loader_count == 1 and html.count(PINNED_BUNDLE) != 1:
            errors.append(f"{filename}: MathJax is not using the pinned bundle")

    if errors:
        raise SystemExit("Site validation failed:\n- " + "\n- ".join(errors))

    print(f"Site validation passed for {len(PAGES)} pages.")


if __name__ == "__main__":
    main()
