CUSTOM SYSTEM SOUNDS
====================

Drop audio files into this folder to replace the built-in synthesized sounds.
Files you do not provide fall back to the synthesized versions automatically.

The OS resolves each event in this order:
  1. The authentic Win98 sample mapped to the event (see table below).
  2. The built-in synthesized sound.

AUTHENTIC SAMPLES CURRENTLY WIRED (original Windows file names, kept as-is):

  startup    The Microsoft Sound.wav   reaching the desktop
  shutdown   LOGOFF.WAV                shutting down
  error      CHORD.WAV                 error message boxes + crash beeps
  warn       NOTIFY.WAV                warning message boxes
  click      START.WAV                 UI click / tick
  recycle    RECYCLE.WAV               sending files to the Recycle Bin
  launch     CHIMES.WAV                opening a program window
  ding       DING.WAV                  general notification
  tada       TADA.WAV                  success fanfare

The mapping lives in src/os/audio.ts (CUSTOM_SOUND_FILES). Add or change an
entry there to point an event at a different file name.

EVENTS WITHOUT A SAMPLE (still synthesized) -- add a CUSTOM_SOUND_FILES entry in
src/os/audio.ts to override:

  menuOpen     opening menus
  networkUp    ethernet connected
  networkDown  ethernet disconnected
  minimize     minimizing a window
  restore      restoring a window

Note: browsers only allow audio after your first click/keypress on the page,
so the very first boot of a fresh visit may be silent until you interact.
