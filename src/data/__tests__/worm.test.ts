import { describe, expect, it } from 'vitest'
import { WORM_OUTBOX_CONTACTS, wormOutboxItems } from '../worm'

describe('ILOVEYOU outbox theatre (display-only)', () => {
  it('addresses every fake contact on an RFC 2606 reserved domain, so none can be real', () => {
    expect(WORM_OUTBOX_CONTACTS.length).toBeGreaterThan(10)
    for (const contact of WORM_OUTBOX_CONTACTS) {
      // example.com / example.net / example.org are reserved for documentation and
      // can never route to a real person.
      expect(contact.addr).toMatch(/@example\.(com|net|org)$/)
    }
  })

  it('builds one copy per contact from a pure mapping (no side effects)', () => {
    const items = wormOutboxItems((contact, index) => ({ addr: contact.addr, index }))
    expect(items).toHaveLength(WORM_OUTBOX_CONTACTS.length)
    expect(items[0]).toEqual({ addr: WORM_OUTBOX_CONTACTS[0].addr, index: 0 })
    expect(items.map((item) => item.index)).toEqual(WORM_OUTBOX_CONTACTS.map((_, i) => i))
  })
})
