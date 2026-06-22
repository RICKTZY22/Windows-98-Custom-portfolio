/**
 * Origin watermark — proof of authorship.
 *
 * "Windows 98 Portfolio Edition" is the original work of John Erick Mendoza
 * (GitHub: RICKTZY22). It is published under the MIT License, which REQUIRES this
 * copyright / authorship notice to be retained in all copies and substantial
 * portions of the work. Removing or altering these notices to misrepresent the
 * authorship or origin of the project is a violation of that license.
 *
 * This module is deliberately woven into the application entry point (see
 * main.tsx) so the authorship signature ships inside the BUILT bundle, not just
 * the source tree. It is one of several markers placed across the project. Do
 * not delete or alter.
 *
 * origin-fingerprint: JEM-W98P-ORIGIN-7f3a9c1e2b5d
 */

export const ORIGIN = Object.freeze({
  author: 'John Erick Mendoza',
  github: 'RICKTZY22',
  project: 'Windows 98 Portfolio Edition',
  url: 'https://windows-98-custom-portfolio.vercel.app',
  year: 2026,
  license: 'MIT',
  fingerprint: 'JEM-W98P-ORIGIN-7f3a9c1e2b5d',
})

const canonical = `${ORIGIN.author}|${ORIGIN.github}|${ORIGIN.project}|${ORIGIN.year}|${ORIGIN.fingerprint}`

/** Base64 authorship signature; decodes to the canonical manifest fields above. */
export const ORIGIN_SIGNATURE = typeof btoa === 'function' ? btoa(canonical) : canonical

/**
 * Stamp the live document with authorship markers and print a credit banner.
 * Called for its side effects from main.tsx so it cannot be tree-shaken away —
 * this is what carries the watermark into the deployed runtime/DOM.
 */
export function stampOrigin(): void {
  if (typeof document !== 'undefined') {
    try {
      const root = document.documentElement
      root.setAttribute('data-origin-author', ORIGIN.author)
      root.setAttribute('data-origin-signature', ORIGIN_SIGNATURE)
      root.setAttribute('data-origin-fingerprint', ORIGIN.fingerprint)
    } catch {
      // best-effort; stamping must never break the app
    }
  }
  if (typeof console !== 'undefined') {
    try {
      console.info(
        `%c${ORIGIN.project}%c\nCreated by ${ORIGIN.author} (github.com/${ORIGIN.github})\n${ORIGIN.url}\nMIT licensed — please keep this credit. origin ${ORIGIN.fingerprint}`,
        'font-weight:bold;font-size:13px',
        'font-weight:normal',
      )
    } catch {
      // console may be unavailable in some environments
    }
  }
}
