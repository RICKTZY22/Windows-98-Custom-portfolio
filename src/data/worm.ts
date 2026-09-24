// Shared constants for the ILOVEYOU worm simulation. Everything here is inert
// browser theatre: the "worm" only rewrites the virtual filesystem and flips a
// display flag. It never touches the real machine, and BIOS Setup > Restore
// System (Factory Reset) fully reverses it.

// The name the shell shows in place of every real label once "infected". This is
// the exact filename the historical worm arrived as (a hidden .vbs behind a fake
// .TXT extension).
export const WORM_DISPLAY_NAME = 'LOVE-LETTER-FOR-YOU.TXT.vbs'

// The disk path the fake attachment is seeded at.
export const WORM_FILE_PATH = 'C:\\My Documents\\LOVE-LETTER-FOR-YOU.TXT.vbs'

// The body the worm writes over every file's contents. A faithful excerpt of the
// real 2000 VBScript header (author credit and all), followed by a plain-language
// note that this is a simulation.
export const WORM_VBS_BODY = [
  'rem barok -loveletter(vbe) <i hate go to school>',
  'rem by: spyder / ispyder@mail.com / @GRAMMERSoft Group / Manila, Philippines',
  'On Error Resume Next',
  'dim fso,dirsystem,dirwin,dirtemp,eq,ctr,file,vbscopy,dow',
  'eq="" : ctr=0',
  'set fso = CreateObject("Scripting.FileSystemObject")',
  'set file = fso.OpenTextFile(WScript.ScriptFullName,1)',
  'vbscopy=file.ReadAll',
  '',
  "rem === SIMULATION NOTE ===================================================",
  'rem This file was overwritten by the ILOVEYOU worm simulation. In May 2000',
  'rem the real worm overwrote documents, images and scripts with copies of',
  'rem itself and mailed itself to every Outlook contact. Nothing real was',
  'rem harmed here: this is a browser sandbox. To restore the simulated PC,',
  'rem restart and open BIOS Setup, then choose Restore System (Factory Reset).',
  'rem =====================================================================',
].join('\n')
