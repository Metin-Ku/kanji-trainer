-- One-time: assign all existing content to the primary owner (default user id 1).
-- Child tables (srs_cards, word_relations, category_words, theme_words, etc.)
-- inherit ownership via words/themes/categories.

DO $$
DECLARE
  owner_id integer := 1;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = owner_id) THEN
    RAISE EXCEPTION 'Owner user id % not found. Create admin first.', owner_id;
  END IF;

  UPDATE words SET user_id = owner_id;
  UPDATE themes SET user_id = owner_id;
  UPDATE categories SET user_id = owner_id;

  -- Orphan or legacy study_activity rows
  UPDATE study_activity SET user_id = owner_id WHERE user_id IS NULL;

  -- Drop cross-owner junction rows (should be none after assignment)
  DELETE FROM category_words cw
  USING categories c, words w
  WHERE cw.category_id = c.id
    AND cw.word_id = w.id
    AND c.user_id IS DISTINCT FROM w.user_id;

  DELETE FROM theme_words tw
  USING themes t, words w
  WHERE tw.theme_id = t.id
    AND tw.word_id = w.id
    AND t.user_id IS DISTINCT FROM w.user_id;

  DELETE FROM word_relations wr
  USING words w1, words w2
  WHERE wr.word_id = w1.id
    AND wr.related_word_id = w2.id
    AND w1.user_id IS DISTINCT FROM w2.user_id;

  -- Remove srs_cards / mistakes for words that no longer exist
  DELETE FROM srs_cards sc
  WHERE NOT EXISTS (SELECT 1 FROM words w WHERE w.id = sc.word_id);

  DELETE FROM word_mistakes wm
  WHERE NOT EXISTS (SELECT 1 FROM words w WHERE w.id = wm.word_id);
END $$;
