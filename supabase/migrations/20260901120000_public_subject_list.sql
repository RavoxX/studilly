-- Let the subject list be read before sign-in.
--
-- The iOS app asks the four setup questions before it asks for an account, so
-- a student picks their subjects while still anonymous. The list is the names
-- of school subjects: reference data with nothing in it that belongs to
-- anyone, and already visible to every signed-in user.
--
-- Scoped to select. The table stays unwritable from any client, and every
-- other reference table keeps its authenticated-only policy.

create policy "subjects_read_anon" on subjects
  for select to anon using (true);
