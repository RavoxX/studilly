# Privacy and data protection

Studilly is built for students in Germany and will be used by minors. This
document records what the software actually does, and what only the operator
can decide.

**It does not claim GDPR compliance.** Compliance depends on organisational
decisions outside the code: processor agreements, retention periods, a record
of processing activities, and an age policy. Those are listed at the end.

## What is stored

| Category | Data | Purpose |
| --- | --- | --- |
| Account | Email, display name, password hash | Sign-in, addressing the student |
| School context | Bundesland, school type, grade, stage, subjects | Generating exams that match the student's actual schooling |
| Learning content | Uploaded files, extracted text, chunks, embeddings | The core function |
| Performance | Exams, answers, per-criterion marking, grades | Feedback and progress |
| Derived | Weakness model, flashcard scheduling, plans | Targeted practice |
| Usage | Monthly counters per metered operation | Enforcing plan limits |
| Groups | Membership, explicitly shared resources, messages | Study groups |

### What is not collected

No tracking, no advertising identifiers, no third-party analytics, no
behavioural profiling. Cookies are limited to the Supabase auth session and two
preference cookies (language, theme), all strictly necessary.

## Where it is stored

- **Supabase**, region `eu-central-1` (Frankfurt). Database and file storage.
  Chosen deliberately: student data stays in the EU by default.
- **OpenAI**, United States. Receives excerpts of uploaded material and student
  answers at the moment of processing. This is the transfer that needs a legal
  basis; see the checklist.
- **RevenueCat**, United States. Receives the app user id and purchase events.
  No payment data in this build, since it is Test Store only.

## Privacy-preserving choices in the code

**Data minimisation in study groups.** Members see a display name and what has
been deliberately shared. No email, no profile, no learning data, no
performance. Joining a group grants access to the group, never to a member's
library.

**Retrieval instead of bulk transfer.** Only the passages relevant to the
selected topics are sent to the model, not whole documents. Less data leaves
the EU, and it costs less.

**Private storage.** The bucket is not public. Files are reachable only through
short-lived signed URLs after an ownership check.

**Opt-in, not opt-out.** The only optional processing (keeping generated tasks
for quality review) defaults to off.

**Real deletion.** Account deletion removes storage objects first, while the
paths are still known, then deletes the auth user, which cascades every
user-owned row. Reversing that order would orphan uploaded schoolwork in the
bucket. Group shares are withdrawn and owned groups deleted.

**Real export.** `GET /api/account/export` returns everything as JSON: profile,
school context, materials and their extracted text, exams, answers, marking,
weaknesses, flashcards, plans, memberships, usage. Embeddings are excluded as a
meaningless internal representation.

**Minimal logging.** Server logs record an error's own message only. Student
content, prompts and payloads are never logged.

## Automated marking

Studilly marks answers with an AI model. The marking:

- is for practice only,
- is not a school grade and has no legal effect,
- is not transmitted to the student's school,
- computes points per criterion, with the grade derived arithmetically by the
  backend from a scale the student can change.

This is stated in the privacy policy and on the results page.

## What the operator must still do

The application cannot decide these. Each corresponds to a `[PLATZHALTER]` in
the legal pages.

1. **Identify the controller.** Legal entity, address, contact, and a data
   protection officer if Art. 37 applies.

2. **Sign processor agreements (Art. 28)** with Supabase, OpenAI, RevenueCat
   and the hosting provider.

3. **Establish a transfer mechanism** for the United States, for OpenAI and
   RevenueCat. Confirm the current basis and document it.

4. **Set an age policy.** Studilly is aimed at school students and will be used
   by minors. Decide the minimum age for independent use and how parental
   consent under Art. 8 is obtained and recorded. In Germany 16 is the usual
   threshold. **The application currently implements no age gate.**

5. **Define retention periods.** Learning data lives until the student deletes
   it, which is defensible, but server log retention and any statutory
   accounting retention need deciding.

6. **Write the record of processing activities (Art. 30).**

7. **Assess whether a DPIA (Art. 35) is required.** Automated evaluation of
   minors' performance, at scale, is a plausible trigger.

8. **Name the supervisory authority** in the privacy policy.

9. **Complete the Impressum.** Every field is a placeholder. An incomplete
   Impressum is itself a legal risk in Germany.

10. **Add the withdrawal notice** before real payments are enabled.

11. **Have all of it reviewed by a qualified lawyer.** The texts in the app
    describe the implemented technical measures accurately, and say plainly
    that they are incomplete. They are not legal advice.

## Rights, and where they are handled

| Right | Status |
| --- | --- |
| Access (Art. 15) | Self-service JSON export |
| Rectification (Art. 16) | Settings |
| Erasure (Art. 17) | Self-service account deletion |
| Portability (Art. 20) | Self-service JSON export |
| Restriction (Art. 18) | Manual, by the operator |
| Objection (Art. 21) | Manual, by the operator |
| Withdraw consent (Art. 7) | Settings, for the one optional processing |
