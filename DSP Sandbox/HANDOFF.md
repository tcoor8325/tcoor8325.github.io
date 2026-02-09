## Current Status
- Canvas UI with Audio Source and Filter blocks, draggable connections, and inspector-driven settings.
- Filter blocks process connected audio; Audio Source blocks generate white noise or sine tone.
- Two draggable probes (blue/green) tap block or connection outputs by overlap and drive the scope; each probe has a mute button.
- Scope renders time and frequency plots with axes and overlays both probe traces.
- Triggered time display aligns to a rising zero-crossing over a 1/8 buffer window.
- Sample rate label appears once the AudioContext is created.
- Home view and tabs toggle between Home and AUDIO DSP Sandbox.
- Project files now live in `DSP Sandbox/` under `Digital Portfolio/`.
- Tech Tree is available as a separate tab via an iframe.
- Music tab now loads a separate music app from `music/` via iframe.

## Next Steps / Open Questions
- Implement block metadata files (create/delete/update) as described in README.
- Improve connection hit-testing for probes (curve-based instead of bounding box).
- Decide how probes should behave when overlapping multiple targets (priority rules).
- Consider persistent layout saving/loading for blocks, connections, and probes.

## Testing
- Not run (manual browser check recommended).
