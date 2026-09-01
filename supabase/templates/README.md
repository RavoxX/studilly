# Auth email templates

The three emails Supabase Auth sends on Studilly's behalf. They are plain HTML
files so they can be pasted straight into the dashboard, and reviewed in a diff
like any other code.

## Applying them

Email template customisation is available on the Supabase **free** plan.

Dashboard → **Authentication → Emails → Templates**, then for each template
paste the file contents into the message body and set the subject:

| Template in Supabase   | File                   | Subject |
| ---------------------- | ---------------------- | ------- |
| Confirm signup         | `confirm-signup.html`  | `Bestätige deine E-Mail-Adresse · Confirm your email` |
| Reset password         | `reset-password.html`  | `Passwort zurücksetzen · Reset your password` |
| Change email address   | `change-email.html`    | `Neue E-Mail-Adresse bestätigen · Confirm your new email` |

There is no API token for the project in this repo, so the dashboard is the
only way to apply them. Re-paste after editing a file: the dashboard copy is
the one that ships, and nothing here syncs automatically.

Templates not listed above (magic link, invite, reauthentication) are left at
Supabase's defaults because Studilly does not use those flows.

## The reset mail is not just the shell with different words

It carries three things the other two do not, because a password-reset mail is
the one an attacker triggers:

- **The account address, printed.** It catches a typo in the address someone
  entered, and it tells a person with more than one account which one this is.
- **"Your current password still works."** Without that line, a mail like this
  reads as though something has already been taken away.
- **A block for the person who did not ask for it.** Not a line in the footer:
  its own panel, saying what to do (nothing changes unless the link is opened;
  if these keep arriving, change the password and stop reusing it) rather than
  only saying not to worry.

## Why they look the way they do

- **Both languages in one email.** Supabase stores one template per project and
  sends it before it knows anything about the recipient's UI language, so the
  locale a user picked in the app cannot reach these. German leads, English
  follows under a rule. Faking per-locale delivery would mean sending half the
  users an email in a language they did not choose.
- **The wordmark is text, not the logo image.** Most clients block remote
  images by default, so an `<img>` header would show as a broken box on first
  open. Text always renders.
- **The raw URL is printed under every button.** Buttons fail more often in
  email than anywhere else — stripped styles, tap targets, forwarded messages —
  and a copyable link is the fallback that always works.
- **Inline styles carry the design; the `<style>` block only adds dark mode and
  one mobile breakpoint.** Clients that strip `<head>` still get the full
  layout, just in light colours.
- **No expiry times are stated in figures.** The link lifetime is a project
  setting, and printing a number the config could contradict would be worse
  than saying "expires after a while, request a new one".
- **Every mail says what to do if you did not request it**, in both languages,
  before the footer links.

## Editing

`{{ .ConfirmationURL }}`, `{{ .SiteURL }}`, `{{ .Email }}` and `{{ .NewEmail }}`
are Go template variables filled in by Supabase. Leave them exactly as written.

To preview a change, substitute the variables and open the file in a browser:

```bash
sed -e 's|{{ .ConfirmationURL }}|https://example.com/link|g' -e 's|{{ .SiteURL }}|https://example.com|g' supabase/templates/confirm-signup.html > /tmp/preview.html && open /tmp/preview.html
```
