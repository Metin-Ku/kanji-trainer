CREATE TABLE IF NOT EXISTS srs_review_log (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id integer NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  deck_type text NOT NULL,
  date text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS srs_review_log_user_deck_date_idx
  ON srs_review_log (user_id, deck_type, date);

-- Best-effort backfill from last_review (UTC calendar date).
INSERT INTO srs_review_log (user_id, word_id, deck_type, date, reviewed_at)
SELECT
  user_id,
  word_id,
  deck_type,
  to_char(last_review AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
  last_review
FROM srs_cards
WHERE last_review IS NOT NULL;
