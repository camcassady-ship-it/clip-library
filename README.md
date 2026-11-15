# Byrd Baseball: Clip Library (Position Replays)

Static site for William Byrd High School Baseball (Coach Cameron Cassady). It has 79 MLB clips from Baseball Savant, in three parts:

- **Part 1** (33 clips): double plays, hard hit balls & range plays, slow rollers, first base plays, relays & cutoffs.
- **Part 2** (26 clips): bunt defense, pickoffs & rundowns, tag plays at bases, infield-in.
- **Postseason 2026** (20 clips): situational plays from the 2026 Wild Card, Division Series, LCS and World Series. Coaching points are drafts until reviewed.

Each play card has a **Full play** button plus one replay button per position that touches the ball. A position button seeks within the single clip mp4 and plays only that window, at 1×, 0.5× or 0.25×, with optional looping.

- `clips.json` holds `parts[] → categories[] → plays[]`, each with `segments` (`start` and `end` in seconds, plus `confidence`).
- `clips/` holds the H.264 mp4s, 960×540, faststart.
- `posters/` holds the poster frames.
- Links: `#part1`, `#part2`, `#postseason-2026`, a category id (for example `#relays`), or a play id (for example `#ps01`).

The old Part 2 site (clip-library-part-2) redirects here.
