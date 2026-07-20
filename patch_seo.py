"""
Run this after jemdoc to inject SEO meta tags into each HTML file.
Usage: python patch_seo.py
"""

import re

BASE_URL = "https://vh-tran.github.io"

PAGES = {
    "index.html": {
        "description": "Viet-Hoang Tran – Ph.D. student in Mathematics at the National University of Singapore (NUS).",
        "keywords": "Viet-Hoang Tran, Tran Viet Hoang, machine learning, parameter space symmetry, mode connectivity, metanetwork, optimal transport, NUS, National University of Singapore, neural functional networks, tree-sliced Wasserstein",
        "og_title": "Viet-Hoang Tran",
        "canonical": f"{BASE_URL}/",
        "schema": """<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Viet-Hoang Tran",
  "url": "{base}/",
  "affiliation": {{
    "@type": "Organization",
    "name": "National University of Singapore",
    "url": "https://nus.edu.sg/"
  }},
  "jobTitle": "Ph.D. Student in Mathematics",
  "alumniOf": {{
    "@type": "Organization",
    "name": "Hanoi University of Science"
  }},
  "sameAs": [
    "https://scholar.google.com/citations?hl=en&user=HXsV5dQAAAAJ&view_op=list_works&sortby=pubdate"
  ],
  "description": "Ph.D. student in Mathematics at the National University of Singapore, researching machine learning, parameter space symmetry, mode connectivity, metanetworks, and optimal transport.",
  "email": "hoang.tranviet@u.nus.edu"
}}
</script>""".format(base=BASE_URL),
    },
    "publications.html": {
        "description": "Publications by Viet-Hoang Tran – Ph.D. student at the National University of Singapore. Papers at NeurIPS, ICML, ICLR on neural functional networks, parameter space symmetry, and optimal transport.",
        "keywords": "Viet-Hoang Tran publications, neural functional networks, tree-sliced Wasserstein distance, parameter space symmetry, NeurIPS, ICML, ICLR",
        "og_title": "Viet-Hoang Tran | Publications",
        "canonical": f"{BASE_URL}/publications.html",
        "schema": "",
    },
    "talks.html": {
        "description": "Talks and presentations by Viet-Hoang Tran – Ph.D. student at the National University of Singapore. Invited talks at NeurIPS, ICLR, UCLA, Rice University, and other venues.",
        "keywords": "Viet-Hoang Tran talks, invited talks, machine learning seminar, NeurIPS oral, ICLR",
        "og_title": "Viet-Hoang Tran | Talks",
        "canonical": f"{BASE_URL}/talks.html",
        "schema": "",
    },
}

INJECT_MARKER = '<meta http-equiv="Content-Type" content="text/html;charset=utf-8" />'

for filename, meta in PAGES.items():
    with open(filename, "r", encoding="utf-8") as f:
        html = f.read()

    if 'name="viewport"' in html:
        print(f"{filename}: SEO tags already present, skipping.")
        continue

    tags = f"""<meta name="google-site-verification" content="vF07eozERs0B_XCsLKBS5_4bnkOF3awTJbaoPMgkoUY" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="{meta['description']}" />
<meta name="author" content="Viet-Hoang Tran" />
<meta name="keywords" content="{meta['keywords']}" />
<meta property="og:title" content="{meta['og_title']}" />
<meta property="og:description" content="{meta['description']}" />
<meta property="og:type" content="{'profile' if filename == 'index.html' else 'website'}" />
<meta property="og:url" content="{meta['canonical']}" />
<link rel="canonical" href="{meta['canonical']}" />"""

    if meta["schema"]:
        tags += "\n" + meta["schema"]

    html = html.replace(INJECT_MARKER, INJECT_MARKER + "\n" + tags)

    with open(filename, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"{filename}: SEO tags injected.")
