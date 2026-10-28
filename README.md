# Audiomics Voice Recording (iPad)

Web page used in rhinology clinic to collect short voice samples for the CRS R01 voice/audiomics aim. Version 3.2, October 2026. Replaces the version written by the previous research fellow.

## Files

- `audiomics-recorder.html` — the whole app (HTML, CSS, JavaScript, and the logo). Nothing else is required to run it.
- `sw.js` — optional service worker. If hosted in the same folder, the page can be reloaded with no Wi-Fi.
- `README.md` — this file.

## Hosting

- Host both files in the same folder on any HTTPS web host. Microphone access does not work over plain HTTP.
- Open the page in Safari on the iPad and bookmark it. Opening it from a Home Screen icon also works, but Safari is the better-tested path for the share sheet.
- After uploading a new version, bump `CACHE_NAME` in `sw.js` (for example `audiomics-recorder-v3.3`) so iPads that cached the old page pick up the new one. Reloading the page twice also refreshes it.

## Clinic workflow

1. Staff: enter the 9-digit MRN and date of visit, tap Continue, check the values on the confirmation screen, then tap Confirm and hand to patient.
2. Patient: reads the instruction screen (normal speaking voice, regular volume, iPad about an arm's length away), taps I'm Ready.
3. For each of the six tasks the patient taps Start, waits for the 3-second countdown (a full-screen blue countdown that repeats the task title and instruction, and for the sentences shows the sentence to read first), and records. Afterwards they can tap the play button (▶) to listen, then Redo or Next. Redo replaces the take.
   - Task 1: 5 s of room noise with the patient quiet. It comes first so the patient can get used to the layout and timing (Start, countdown, recording, review) before they have to speak.
   - Tasks 2–5: sustained "ahh", "eee", "mmm", "nnn", 5 s each (file names aaa, eee, mmm, nnn), stop automatically.
   - Task 6: six sentences, one recording each. One countdown before sentence 1; the current sentence is highlighted and the others are greyed out. The patient taps Next sentence after each one (Done reading after the last), with no countdown in between. A review list then shows Play and Redo for each sentence; Redo re-records only that sentence (with a countdown). Redo all at the bottom starts the whole task over.
4. Staff: on the final screen tap Save all (all 11 recordings plus the complete file; each file also has its own Play button), then choose Save to Files (or Box) in the share sheet. Each file can also be saved individually. The screen says "Saved" next to each file once the share sheet closes successfully.
5. Tap Record another patient. If any file is unsaved, the page asks before clearing.

A staff member can cancel at any point from the task screen (link at the bottom). Unsaved recordings are discarded.

The screen is kept awake from the confirmation step until Record another patient (Screen Wake Lock API, iPadOS 16.4 and later; older versions fall back to the iPad's auto-lock setting). While any recording is unsaved, reloading, closing, or leaving the page brings up the browser's standard "leave this page?" prompt on desktop browsers. **iPad Safari does not support this prompt** (caniuse lists `beforeunload` as unsupported in every iOS Safari version), so on the iPad the only protection is the confirm on Record another patient and Cancel session. Staff should not reload or close the tab before saving.

## Output

One WAV file per task:

```
<MRN>_<YYYY-MM-DD>_room.wav
<MRN>_<YYYY-MM-DD>_aaa.wav
<MRN>_<YYYY-MM-DD>_eee.wav
<MRN>_<YYYY-MM-DD>_mmm.wav
<MRN>_<YYYY-MM-DD>_nnn.wav
<MRN>_<YYYY-MM-DD>_sentence1.wav   ... through sentence6.wav
<MRN>_<YYYY-MM-DD>_complete.wav
<MRN>_<YYYY-MM-DD>_log.csv          session log (see Recording log below)
```

- Format: RIFF WAV, 16-bit PCM, mono, native device sample rate (44.1 or 48 kHz on current iPads; the rate is in the WAV header and shown on the save screen).
- Timed tasks are trimmed to exactly 5 s × sample rate samples.
- The complete file joins all 11 recordings in order (room, aaa, eee, mmm, nnn, sentence1–6), with 0.5 s of digital silence (zeros) between them (`COMPLETE_GAP_SEC` in the code). The samples are identical to the per-task files. Task boundaries can be found from the per-task durations: task *k* starts at the sum of the earlier durations plus 0.5 s × (*k* − 1). The silence is not room noise, so use `room.wav`, not the gaps, for any noise-floor measure.
- If the same patient is recorded twice on the same day, the second set has the same file names. Files, Box, and most computers will keep both (Files appends " 2"); check before overwriting.

## Recording log

There are two layers, so the audit trail survives if either one is lost.

1. **Running log on the iPad.** Every file from every session gets a row, written when the save screen opens and updated after each save attempt. It is stored in the iPad's browser storage (IndexedDB) for the hosting site. Staff open it from the "Recording log (staff)" link on the first screen. The link shows a count when any logged file was never saved. The log screen lists sessions newest first, with "x of 13 saved" and the names of any unsaved files. **Export full log (CSV)** shares the whole log as `audiomics_recording_log_<date>_<time>.csv`; save it to the same Box folder.
2. **Per-session log** (`<MRN>_<date>_log.csv`). This is built when the save screen opens and included in Save all. It lists every file in the session (no save status, since it is written before saving), so the expected files can be rebuilt from the Box folder alone.

Columns (running log; the per-session log has the same columns minus the six status columns):

| Column | Meaning |
|---|---|
| session_id | MRN_date_HHMMSS, local time the staff member confirmed the MRN |
| session_started | Local date and time the session started |
| mrn, visit_date | As entered and confirmed |
| recording_id, file_name | room, aaa, eee, mmm, nnn, sentence1–6, complete, log |
| takes | Number of takes recorded for that task (1 = no redo; blank for complete and log) |
| duration_s, sample_rate, bytes | Length, rate, and exact file size (a file in Box with a different size did not upload completely) |
| status | not saved, saved (share sheet), saved (download), or session cancelled |
| save_attempts | Times Save or Save all was tapped with this file included |
| first_saved_at, last_attempt_at | Local times |
| last_attempt_result | shared, cancelled (share sheet dismissed), failed (error), downloaded (desktop only) |
| last_error | Error text for a failed attempt |
| app_version, device_label, device | App version, the label set on the log screen, and the browser's user agent plus touch-point count (iPadOS Safari reports a Mac user agent) |
| echo_cancellation, noise_suppression, auto_gain_control | Mic settings Safari reported for the session |

What "saved (share sheet)" means: the share sheet finished handing the files over (Save to Files completed, or the Box app accepted them). The page cannot see whether a later upload inside another app succeeded, so for an audit, compare the log's file names and byte sizes with what is in Box.

Keeping the iPad log:

- Set "This iPad's label" on the log screen once per iPad before first use. Rows only carry the label from the time it is set.
- Open the page from a Home Screen icon (Share → Add to Home Screen). Safari can clear stored data for sites that go unused for a while. Home Screen web apps keep their own data, and Safari 17+ is more likely to grant the page's request for persistent storage. See the WebKit sources below.
- Export the full log regularly (for example weekly) and after any iPadOS update. Each export contains the full history, so the newest export supersedes earlier ones.

## How the audio is captured

- `getUserMedia` is called with `echoCancellation`, `noiseSuppression`, and `autoGainControl` all set to `false`, and one channel. These three stages alter amplitude and periodicity measures (jitter, shimmer, HNR, intensity) if left on. Safari does not guarantee it will honour every flag, so the settings the track actually reports are printed at the bottom of the save screen; check them on each iPad model once.
- Samples are read from the Web Audio graph (`ScriptProcessorNode`, 4096-frame buffers) as 32-bit float PCM and written to WAV in JavaScript. `MediaRecorder` is not used: on iPad Safari it records to compressed AAC, and the previous version then re-encoded that to WAV, so the "WAV" files carried AAC artifacts.
- The on-screen timer is driven by the number of captured samples, not a clock, so it cannot run fast or stall independently of the audio.
- Nothing is uploaded. Files leave the iPad only through the share sheet.

## iPad settings to check

- Portrait orientation recommended; staff can lock rotation from Control Center.
- Settings → Safari → Microphone: Allow (or Ask) for the hosting site.
- Settings → Safari → Downloads: not used any more, but if old recordings are missing they may be in whatever folder is set here.
- The first Start tap on each session triggers Safari's microphone prompt. Tap Allow.
- Box: install the Box app and sign in once; it then appears in the share sheet.

## Branding

Follows the Houston Methodist Brand Guide (supplied PDF):

- Colours (pp. 15-17): Methodist Blue #124A7E for headings, buttons, and the countdown screen; Houston Accent Blue #749ABB tints (10/20/30%) for backgrounds, borders, and light fills, because Methodist Blue is not approved for tints. Mulberry Red #AB0032 (and its 10% tint) is the single secondary colour, used for the recording state and warnings, per the rule against pairing the primary colours with more than one secondary colour.
- Type (pp. 19-23): the font stack lists Berthold Akzidenz Grotesk and Franklin Gothic first. These are licensed fonts that are not installed on iPads, so the page falls back to the iPad system sans-serif. One family is used throughout. The page heading is set in all caps, as the guide prefers for headlines; no italics.
- Logo (pp. 6, 9): the official PNG, embedded, at 240 px wide (web minimum is 70 px), with clear space of at least the height of the "M" on all sides.

## Changes from version 1 (previous fellow's version)

- Added mmm and nnn tasks and the room-noise task.
- Each task is started by a tap and followed by Next / Redo, rather than running automatically.
- One file per task instead of one continuous file.
- Saving through the share sheet instead of an automatic download (which Safari was opening in its player rather than saving).
- Mic processing turned off; raw PCM capture instead of MediaRecorder → WAV conversion.
- Visit date defaults to the local date (was UTC, so it showed the next day after about 7 pm Central).
- Success message only appears once files are built, and says that they still need to be saved.
- MRN confirmation screen. The MRN must be exactly 9 digits: non-digits are removed as they are typed, and Continue stays disabled until 9 digits are entered.
- Cancel-session link for staff.
- No external fonts or scripts; optional service worker for offline reload.
- Fixed: countdown overlay colour (was a leftover teal), invalid list markup, ring not resetting between patients, download link revoked before Safari finished.

## Changes in 3.2

- Save all handles browsers that limit how many files one share can hold. Chrome and Edge refuse more than 10 files per share ("Permission denied"). Save all first tries all 13. If that is refused, it switches to groups of 10 (remembered on that device), relabels the button ("Save next 10 files", then "Save remaining 3 files"), and each tap saves the next group. Safari, which publishes no limit, still saves everything in one tap. The refused attempt is recorded in the log as "failed" with the error text.

## Changes in 3.1

- Sentence task: an instruction box above the sentences (before Start and while reading) explains tapping Next sentence after each one and Done reading after the last. The line under the title names the button to tap for the current sentence, and the welcome screen and countdown screen mention it too.

## Changes in 3.0

- Running recording log on the iPad, with a staff log screen, unsaved-file count, iPad label, and CSV export.
- Per-session log CSV saved with the audio.
- Each save attempt's result (shared, cancelled, failed) is recorded and shown next to unsaved files on the save screen.

## Changes in 2.9

- Page uses the full screen height (the 900 px cap left the sentence review and save screens running below the fold on iPads).
- Save all moved to the top of the save screen.
- Compact spacing on short screens (iPad landscape). Checked at iPad mini, iPad, and iPad Pro 13" sizes in portrait and landscape, with Safari's toolbar height subtracted: each screen's main button is visible without scrolling. Portrait is still the recommended orientation.

## Changes in 2.8

- Room noise moved from last to task 1, with the same countdown screen as the other tasks, so it doubles as a practice run. The complete file now starts with the room recording.

## Changes in 2.7

- Countdown is back to the full-screen blue screen, now showing the upcoming task (title, instruction, and, for the sentences, the sentence to read). Replaces the bottom-bar countdown from 2.6.

## Changes in 2.6

- Play controls are play/stop icon buttons instead of the word "Play".
- The countdown is shown in a bar in place of the bottom buttons, instead of a full-screen blue overlay, so the task instructions (and the first sentence, highlighted) stay visible.
- MRN field placeholder reads "9 digit MRN".

## Changes in 2.5

- Play button after every take, and on the save screen.
- Sentences recorded one at a time, each saved as its own file (sentence1–sentence6), with per-sentence redo.
- Desktop download fallback spaces downloads 400 ms apart (Chrome blocks more than 10 rapid downloads; not relevant to the iPad share sheet).

## Changes in 2.4

- Added the combined complete file.
- Screen kept awake during a session.
- Leave-page warning and Record another patient confirmation while files are unsaved.

## Known limitations and possible later additions

- No direct Box API upload. That needs a Box developer app approved by IT and a secure place to keep a token; the share sheet covers the need for now.
- No input level meter or clipping warning. If a take sounds clipped, use Redo.
- The running log lives in one iPad's browser storage. If Safari clears it, the per-session logs in Box still list every file each session produced, but the save status for those sessions is lost.
- Unsaved audio is not kept on the iPad. If the tab is reloaded or closed before saving, the recordings are lost; the log will show those files as "not saved" only if the save screen had opened.
- `ScriptProcessorNode` is deprecated in favour of `AudioWorklet`. It still works in all current browsers; if it is ever removed, the capture code is the only part that needs replacing.

## Sources

- Houston Methodist Brand Guide (colour palette, typography, and logo usage sections).

- Sentences and sustained /a/ and /i/ are the CAPE-V protocol tasks: Kempster GB, Gerratt BR, Verdolini Abbott K, Barkmeier-Kraemer J, Hillman RE. Consensus Auditory-Perceptual Evaluation of Voice: development of a standardized clinical protocol. Am J Speech Lang Pathol. 2009;18(2):124-132. https://doi.org/10.1044/1058-0360(2008/08-0017)
- Microphone constraints (`echoCancellation`, `noiseSuppression`, `autoGainControl`): MDN, MediaTrackConstraints. https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
- Web Audio capture: MDN, ScriptProcessorNode and AudioContext. https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode
- Share sheet: MDN, Navigator.share() and Navigator.canShare(). https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
- WAV layout: Microsoft/IBM RIFF WAVE format, as summarised at http://soundfile.sapp.org/doc/WaveFormat/
- Screen Wake Lock: MDN, Screen Wake Lock API. https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- Playback: MDN, HTMLAudioElement. https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement
- Leave-page warning: MDN, Window: beforeunload event. iOS Safari support status: https://caniuse.com/mdn-api_window_beforeunload_event https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
- Offline caching: MDN, Service Worker API.
- Browser storage for the log: MDN, IndexedDB API. https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- Safari storage clearing and Home Screen web apps: WebKit, "Full Third-Party Cookie Blocking and More" (2020). https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- Persistent storage in Safari 17: WebKit, "Updates to Storage Policy" (2023). https://webkit.org/blog/14403/updates-to-storage-policy/
- CSV quoting follows RFC 4180. https://www.rfc-editor.org/rfc/rfc4180 https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- Effect of smartphone/tablet recording conditions on acoustic voice measures (background for keeping processing off and conditions consistent): Maryn Y, Ysenbaert F, Zarowski A, Vanspauwen R. Mobile communication devices, ambient noise, and acoustic voice measures. J Voice. 2017;31(2):248.e11-248.e23. https://doi.org/10.1016/j.jvoice.2016.07.023
