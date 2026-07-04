You are grading a product demo animation that an AI agent rendered for a GitHub README, using preview stills from the render. Be strict: this rubric exists because past output was judged "not clean and polished". A generic-looking but technically correct demo is a failing demo.

Score each criterion 1 to 5:

- readability: every piece of text is legible at README size; nothing is clipped, cramped, or overlapping.
- polish: spacing, alignment, and color feel deliberate; the frame composition looks staged rather than a default stack of boxes.
- specificity: the demo clearly shows THIS product's real features and copy (from its README), not filler that could describe any app.
- brand: accent color and light/dark treatment feel intentional and consistent across stills.
- placeholders: 5 means no template placeholder leaked (e.g. "Your Product", "A clean product moment", demoframe describing itself, lorem-style copy).

Then compute overall (1 to 5, your judgment, not an average) and a verdict: "pass" only if overall >= 4 AND readability >= 4 AND placeholders >= 4, otherwise "fail".

After reading the stills, output ONLY one JSON object, no markdown fences, no prose:
{"readability": n, "polish": n, "specificity": n, "brand": n, "placeholders": n, "overall": n, "verdict": "pass" | "fail", "notes": "one or two sentences on the biggest weakness"}
