# Internal review library

Open `/docs/hackathon/review.html` on the local Vite server. This is internal project documentation, separate from the product app and framed demo.

- Documents: full canvas, architecture-led SSDLC draft, and earlier canvas.
- Media: latest warm/tactile direction, earlier boards, pitch video and programme PDF, plus review captures. `media-index.json` inventories the 19 saved assets/files present when assembled.
- Tasks: platform deadlines and completion checklist, internal build checklist, and key programme sessions/final requirements. `tasks.json` records the initial task definitions; matching initial data is embedded in `review.html` for standalone local use. Keep both aligned if editing task definitions.
- Time log: `time-log.csv` records focused LuLu work by date and task. Only enter actual focused minutes and outcomes; do not infer time from file or commit timestamps. The daily check-in asks for hours, progress, blockers, and the next task.

Hover or focus a main tab to preview its subheader links; click/tap to open that area. Logo and Print are retained. Checkboxes appear only in Tasks. Completion changes persist in this browser under `lulu.review.completed-tasks.v1`; they do not submit to Sonke or sync to teammates. Initial completions reflect observed platform state or recorded local verification. Completed does not imply accepted on time.

Programme source: original organiser PDF, exported 24 October at 11:43, copied unmodified as `programme-2026.pdf`. Times use SAST. Briefing says noon for the pitch; detailed programme says 13:30. The upload confirmation's feedback date differs from the programme; the UI records the discrepancy rather than inventing a new schedule.

The saved SSDLC is a reviewed draft; the owner submitted after personal edits, so exact submitted wording is not asserted. Financial assumptions in the canvas remain illustrative.

## Local video playback

Video binaries are deliberately excluded from GitHub through .gitignore. The library uses a local VP9/Opus WebM copy first for embedded-browser compatibility, with the original H.264/AAC MP4 as fallback and download. Both live under docs/hackathon/media/ locally. Cloning the repository does not fetch the video; obtain the original from the owner and generate a local WebM if needed. The file uploaded to Sonke is unchanged.
