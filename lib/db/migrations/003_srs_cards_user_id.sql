-- Add user_id to srs_cards and assign from words.owner

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'srs_cards'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE srs_cards ADD COLUMN user_id integer;
  END IF;
END $$;

UPDATE srs_cards sc
SET user_id = w.user_id
FROM words w
WHERE w.id = sc.word_id
  AND (sc.user_id IS NULL OR sc.user_id IS DISTINCT FROM w.user_id);

UPDATE srs_cards SET user_id = 1 WHERE user_id IS NULL;

ALTER TABLE srs_cards ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'srs_cards_user_id_users_id_fk'
  ) THEN
    ALTER TABLE srs_cards
    ADD CONSTRAINT srs_cards_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS srs_cards_word_deck_idx;

CREATE UNIQUE INDEX IF NOT EXISTS srs_cards_user_word_deck_idx
  ON srs_cards (user_id, word_id, deck_type);
