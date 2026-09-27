# Pivots Reference

## Pivots

Watched movies only, independent of movie-list filters. Order: Ratings, Years, Genres, Other, Collections, Actors, Directors, Companies. Years defaults to watched year; unknown is ????. Ratings keeps Numeric/Legacy subsections. Other has Others/Subgenres/Collections/Actors/Directors/Companies sections, with independent sorts and a fixed section order. Main Other sort resets subsection overrides.

Per-panel category search is session-only. Counts/averages use all matching movies, not just displayed rows. Minimum filters groups. Score = (count × average + weight × baseline)/(count + weight), defaults baseline 3 and weight 5. Sort using unrounded values. Stars apply to current saved members; new movies are not automatically starred.

Compact accent subsection headers. First-column separators support dragging, arrows, double-click/Enter fitting visible names. Subsections share their panel's width. Numeric columns reserve 30px Count and 40px Average/Score. Panel width = name width + 116px. Panels wrap on narrow screens.

