# Streaming Rules Source

User-supplied September 2026 snapshot, implemented in 0.0.1.30. Contract claims are retained as supplied, not independently verified. Confidence concerns the rights relationship; all computed dates remain estimates.

The app fetches [TMDB US release dates](https://developer.themoviedb.org/reference/movie-release-dates), preferring theatrical type 3 then limited theatrical type 2. It does not use digital release type 4. The saved general release date is not assumed to be US theatrical.

Verified exceptions can be added to `titleOverrides` in the engine with a source, subscription services, optional officialDate and US distributor. No exceptions are preloaded. Unresolved titles have a manual research link; searches are not run automatically during checks.

```text
Update the built-in rules engine: # US THEATRICAL -> SUBSCRIPTION STREAMING RULES
# Updated: 2026-09
#
# Fields:
# Studio | Labels | PrimaryStreamer | WindowType | MinDays | TypicalDays | MaxDays | Confidence | Notes
#
# Days are measured from US theatrical release.
# "TypicalDays" is an estimate unless Notes explicitly identifies a contractual window.
# NULL means timing is too variable to encode reliably.

Sony Pictures | Columbia Pictures; TriStar Pictures; Screen Gems; Sony Pictures Animation | Netflix | Pay-1 | 90 | 120 | 180 | HIGH | Netflix has exclusive US Pay-1 rights after theatrical and home-entertainment windows.
Sony Pictures | Columbia Pictures; TriStar Pictures; Screen Gems | Disney+; Hulu | Pay-2 | NULL | NULL | NULL | MEDIUM | Applies to eligible Sony 2022-2026 theatrical slate after Netflix Pay-1. Do not use as initial streaming destination.

Universal Pictures | Universal Pictures | Peacock | Pay-1A | 90 | 120 | NULL | HIGH | Peacock receives opening portion of split Pay-1 window.
Universal Pictures | Universal Pictures | Netflix | Pay-1B | NULL | 240 | NULL | HIGH | Netflix receives 10-month exclusive middle portion of Pay-1; begins no later than 8 months after theatrical release under expanded agreement.
Universal Pictures | Universal Pictures | Peacock | Pay-1C | NULL | NULL | NULL | HIGH | Returns to Peacock for final portion of Pay-1 after Netflix.

Focus Features | Focus Features | Peacock | Pay-1A | 90 | 120 | NULL | HIGH | Follows Universal split-window structure.
Focus Features | Focus Features | Netflix | Pay-1B | NULL | 240 | NULL | HIGH | Netflix middle Pay-1 window under Universal agreement.
Focus Features | Focus Features | Peacock | Pay-1C | NULL | NULL | NULL | HIGH | Final Pay-1 portion.

DreamWorks Animation | DreamWorks Animation | Peacock | Pay-1A | NULL | 120 | NULL | HIGH | Universal-owned animation; opening Pay-1 portion.
DreamWorks Animation | DreamWorks Animation | Netflix | Pay-1B | NULL | 120-240 | NULL | HIGH | Netflix receives middle Pay-1 animation window.
DreamWorks Animation | DreamWorks Animation | Peacock | Pay-1C | NULL | NULL | NULL | HIGH | Returns to Peacock.

Illumination | Illumination | Peacock | Pay-1A | NULL | 120 | NULL | HIGH | Universal-owned animation; opening Pay-1 portion.
Illumination | Illumination | Netflix | Pay-1B | NULL | 120-240 | NULL | HIGH | Netflix receives middle Pay-1 animation window.
Illumination | Illumination | Peacock | Pay-1C | NULL | NULL | NULL | HIGH | Returns to Peacock.

Warner Bros. Pictures | Warner Bros. Pictures; New Line Cinema; DC Studios | HBO Max | Pay-1 | NULL | 70-90 | NULL | MEDIUM | No fixed public streaming-day rule. Estimate from recent release patterns; title-specific exceptions expected.

A24 | A24 | HBO Max | Pay-1 | NULL | 90-150 | NULL | HIGH | Exclusive US Pay-1 output deal renewed in 2026. Timing varies by title.

Paramount Pictures | Paramount Pictures | Paramount+ | Pay-1 | 45 | 45-90 | NULL | HIGH | Paramount has committed to at least 45 days of theatrical exclusivity. Streaming date remains title-specific.

Legendary Entertainment | Legendary Entertainment | VARIABLE | VARIABLE | 45 | NULL | NULL | LOW | Paramount theatrical distribution agreement does not guarantee Paramount+ streaming rights. Resolve rights per title.

Walt Disney Studios | Walt Disney Pictures | Disney+ | Pay-1 | NULL | 90 | 60-120 | MEDIUM | Disney controls streaming destination but does not publish a universal fixed window.

Walt Disney Animation Studios | Walt Disney Animation Studios | Disney+ | Pay-1 | NULL | 90 | 60-120 | MEDIUM | Estimate based on Disney release patterns.

Pixar | Pixar Animation Studios | Disney+ | Pay-1 | NULL | 90 | 60-120 | MEDIUM | Estimate based on Disney release patterns.

Marvel Studios | Marvel Studios | Disney+ | Pay-1 | NULL | 90 | 60-120 | MEDIUM | Estimate based on Disney release patterns.

Lucasfilm | Lucasfilm | Disney+ | Pay-1 | NULL | 90 | 60-120 | MEDIUM | Estimate based on Disney release patterns.

20th Century Studios | 20th Century Studios | Hulu; Disney+ | Pay-1 | NULL | 60-120 | NULL | MEDIUM | Destination may be Hulu, Disney+, or integrated Hulu/Disney+ distribution depending on title and current service structure.

Searchlight Pictures | Searchlight Pictures | Hulu; Disney+ | Pay-1 | NULL | 60-120 | NULL | MEDIUM | Destination and timing vary by title.

NEON | NEON | Hulu | Pay-1 | NULL | 90-150 | NULL | HIGH | Hulu has first-window output relationship with NEON. Timing varies by title.

Lionsgate | Lionsgate | Starz | Pay-1 | NULL | 90-180 | NULL | HIGH | Starz receives first portion of Lionsgate Pay-1 window; output relationship extends through at least 2030.

Summit Entertainment | Summit Entertainment | Starz | Pay-1 | NULL | 90-180 | NULL | HIGH | Treat as Lionsgate for Pay-1 streaming.

Amazon MGM Studios | Amazon MGM Studios; MGM | Prime Video | OwnedPlatform | NULL | 60-180 | NULL | MEDIUM | Vertically integrated. No universal public theatrical-to-streaming window; use title-specific date when available.

Apple Original Films | Apple Original Films | Apple TV | OwnedPlatform | NULL | 30-90 | NULL | MEDIUM | Apple controls streaming destination; theatrical strategy and window vary substantially by title.


# RULE PRECEDENCE

1. EXPLICIT_TITLE_DATE
   If an official streaming release date exists for the specific movie, always use it instead of studio rules.

2. EXPLICIT_TITLE_RIGHTS
   If streaming rights for the specific movie are known, use those rights instead of the production company's default rule.

3. DISTRIBUTOR_OVER_PRODUCTION_COMPANY
   Streaming rights usually follow the distributor/rightsholder, not every production company credited on the movie.
   Example: Do not classify a movie as Paramount+ merely because Paramount is involved if another company controls Pay-1 rights.

4. LABEL_INHERITANCE
   If no title-specific exception exists, inherit the parent studio rule:
   Columbia/TriStar/Screen Gems -> Sony
   New Line/DC -> Warner Bros.
   Focus/DreamWorks/Illumination -> Universal
   Pixar/Marvel/Lucasfilm -> Disney
   Summit -> Lionsgate

5. WINDOW_ESTIMATION
   When no official streaming date exists:
   estimatedStreamingDate = theatricalReleaseDate + TypicalDays

6. RANGE_ESTIMATION
   If TypicalDays is a range:
   earliestEstimate = theatricalReleaseDate + lowerBound
   latestEstimate = theatricalReleaseDate + upperBound
   Do not convert the range into an exact date unless the application requires a single estimate.

7. CONFIDENCE
   HIGH = contractual/output relationship is known.
   MEDIUM = destination is predictable but timing is based primarily on observed release patterns.
   LOW = rights must normally be resolved title-by-title.

8. PVOD_IS_NOT SVOD
   Do not treat digital rental/purchase dates as subscription-streaming dates.

9. PAY-1 SPLIT WINDOWS
   Universal-family titles may move Peacock -> Netflix -> Peacock.
   Store these as separate sequential windows rather than replacing Peacock with Netflix.

10. UNKNOWN/INDEPENDENT
   If no studio/output rule matches, return UNKNOWN and search for title-specific distribution/streaming-rights information rather than guessing.
```
