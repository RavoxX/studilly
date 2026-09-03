-- A notebook now starts empty and is named from its first sources.
--
-- The flag records who chose the name. While it is false the server may
-- re-name the notebook as sources are added, which is what makes a notebook
-- that starts as "Neues Notebook" become "Photosynthese – Kapitel 4" the
-- moment there is something to read. The first manual edit sets it, and after
-- that the student's title is never overwritten.

alter table notebooks
  add column named_by_user boolean not null default false;

-- Existing notebooks were named by hand in the create dialog, so they keep
-- their titles.
update notebooks set named_by_user = true;
