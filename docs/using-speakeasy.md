# Using speakeasy day to day

This guide is for the **site owner**. It assumes speakeasy is already
installed on your site (that one-time job is [INSTALL.md](../INSTALL.md), done
by a developer or a coding agent). Everything on this page is point-and-click
or copy-paste; none of it is coding.

## What you have

Your site now has an invisible second layer. You can mint **secret links**
like `https://yoursite.com/Xa9f2Qb7Lm3k`. Anyone holding that link sees the
extra content you chose for them. Anyone without it sees your normal site,
and if they guess at URLs they get a plain "not found" page that reveals
nothing. When you deactivate a link (or it expires), it becomes that same
"not found" page for everyone who had it.

## Open the dashboard

The dashboard runs only on your own computer; it is never part of your public
site. Inside your site's folder, run:

```bash
npx speakeasy admin
```

It opens the dashboard in your browser automatically. Keep the terminal window
open while you work; closing it (or pressing Ctrl+C) just closes the dashboard,
never your site. This works on any site, whatever it is built with.

## Create and share a link

1. In the dashboard, choose **New variant**.
2. Give it a label you will recognize later ("Acme - spring pitch").
3. Tick the items this person should see, in the order they should see them.
4. Pick how long the link should live (or "no expiry"). If you don't choose,
   links last 30 days.
5. Create it, wait for the dashboard to confirm the change is **live**, then
   copy the link and send it.

The confirmation matters: with the usual setup, saving a change also
publishes your site, and the dashboard tells you when that finished. Until it
says live, the link may not work yet.

## Revoke a link

Find the variant in the dashboard and deactivate it. Once the dashboard
confirms the change is live, the link is dead: the person who had it now sees
the same "not found" page as everyone else, with no sign the page ever
existed. Expiry dates do the same thing automatically.

## Hide or show a whole project

The **Projects** tab lists everything on your site with a **Public / Private**
switch. Public projects show on your normal site for anyone. Private projects are
hidden from your site and only ever appear inside a link you share.

Flip a project to **Private** and it drops off your public site the next time the
site updates - you don't move any files yourself. Flip it back to **Public** and
it returns. This is how you take a finished project off the public site while
still being able to show it privately through a link.

(If your site was set up with a custom content system, this switch may be shown
but not clickable - ask whoever installed it.)

## The rules that keep it safe

- **The link is the only key.** Treat each link like a password: send it to
  the person it is for, and know that if they forward it, whoever receives it
  can look until you deactivate it.
- **Keep the site's repository private** if your setup stores variants in it
  (most do). The variant file lists every live link in plain text, so a
  public repository would defeat the whole scheme. When in doubt, ask
  whoever installed it, or see [SECURITY.md](../SECURITY.md).
- **Deactivate when done.** Expiry dates are the safety net; deactivating
  when a conversation ends is the habit.

## If you prefer typing to clicking

The same actions exist as terminal commands, run from your site's folder:

```bash
npx speakeasy items                       # what content can be revealed
npx speakeasy create --label "Acme - Spring" --items about,case-secret --duration 30
npx speakeasy list                        # every live link
npx speakeasy deactivate Xa9f2Qb7Lm3k     # kill a link
```

`npx speakeasy help` lists all commands (`items`, `create`, `list`,
`deactivate`, `set-items`, `set-duration`, `lookup`).

## When something looks wrong

- **The dashboard won't open:** the `npx speakeasy admin` command probably
  isn't running. Start it again and keep the terminal window open.
- **A new link shows "not found":** the change may still be publishing. The
  dashboard reports when it is live; give it a minute.
- **You need to change what a link reveals:** edit the variant in the
  dashboard (or `npx speakeasy set-items ...`). The link itself stays the
  same.
- **Anything else:** this is worth a message to whoever installed it, or an
  issue at the [speakeasy repository](https://github.com/mugen-creative-studio/speakeasy/issues).
