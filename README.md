# Byrd Baseball: Clip Library (Position Replays)

Static site for William Byrd High School Baseball (Coach Cameron Cassady). It has 102 MLB clips from Baseball Savant, grouped by situation: Double Plays, PFP: Pitcher Fielding Plays (3-1, 1-3, 1-6/1-6-3, 1-5), Slow Rollers, Relays & Cutoffs, Outfield Assists, First Base Throws (3-6, 3-2, 3-5), Catcher Throw-Downs (caught stealing 2nd and 3rd), Bunt Defense, Pickoffs & Rundowns, Tag Plays, Infield-In, and Throws Home. The 35 clips from the 2026 postseason carry a "Postseason 2026" badge. Coaching notes appear only where they come from Coach Cassady.

Each play card has a **Full play** button plus one replay button per position that touches the ball. A position button seeks within the single clip mp4 and plays only that window, at 1×, 0.5× or 0.25×, with optional looping.

- `clips.json` holds `categories[] → plays[]`, each with `segments` (`start` and `end` in seconds, plus `confidence`).
- `clips/` holds the H.264 mp4s, 960×540, faststart.
- `posters/` holds the poster frames.
- Links: a section id (for example `#relays`) or a play id (for example `#ps01`). The old `#part1`, `#part2` and `#postseason-2026` links open the top of the page.

The old Part 2 site (clip-library-part-2) redirects here.

To adjust a fielder's start and end times, open `?edit=1` (or the small **Edit segments** link in the footer). Changes stay on that device until they are copied and applied to `clips.json`.
