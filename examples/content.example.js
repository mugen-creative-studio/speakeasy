// Example content source. A content source answers one question: "what can a
// variant reveal?" Return every item the admin can toggle. Mark each public or
// private; only PRIVATE items' `data` ever travels to a visitor (public items
// are assumed to already ship in your client bundle).
//
// This shape is all speakeasy needs. Adapt it to read from your data files, a
// CMS, a database, anything: map a public catalog plus a server-only private
// catalog into exactly this.

export default {
  async items() {
    return [
      // Public: in the variant's curated set the visitor sees it in order, but
      // its real content already ships client-side - no `data` needed here.
      { id: 'about', title: 'About', visibility: 'public' },
      { id: 'case-alpha', title: 'Project Alpha', meta: 'Acme Co', visibility: 'public' },

      // Private: never in the public bundle. `data` is what the lookup endpoint
      // returns to a visitor holding a live slug that includes this id.
      {
        id: 'case-secret',
        title: 'Confidential Redesign',
        meta: 'Stealth Startup',
        visibility: 'private',
        data: {
          id: 'case-secret',
          title: 'Confidential Redesign',
          body: 'The full private case study payload the client renders…',
        },
      },
    ]
  },
}
