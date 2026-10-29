-- Phase: search finds Serbian word forms (0036).
-- Before: "kuvari" (plural) did not find "Kuvar"; the query had to match a
-- whole word exactly. Now each query word loses a common Serbian ending
-- (-i, -a, -e, -ima, -om, -oj, …) and becomes a prefix match, so "kuvari",
-- "kuvarima" and "kuvar" all find "Kuvar" and "kuvarima". Words shorter than
-- 4 letters after stemming stay exact ("c", "mig"). Only the query side
-- changes: the job vector and its index (0033) stay as they are, and GIN
-- serves prefix matches.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS sr_search_query(text);
--   DROP FUNCTION IF EXISTS sr_search_stem(text);
CREATE OR REPLACE FUNCTION sr_search_stem(word text) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE
  suffix text;
BEGIN
  -- Longest first; keep at least 4 letters so short stems don't match widely.
  FOREACH suffix IN ARRAY ARRAY[
    'ovima', 'evima', 'ama', 'ima', 'ovi', 'evi', 'ova', 'eva', 'ove', 'eve',
    'om', 'em', 'og', 'oj', 'ih', 'im', 'a', 'e', 'i', 'o', 'u'
  ] LOOP
    IF length(word) - length(suffix) >= 4 AND right(word, length(suffix)) = suffix THEN
      RETURN left(word, length(word) - length(suffix));
    END IF;
  END LOOP;
  RETURN word;
END
$$;
--> statement-breakpoint
-- websearch_to_tsquery keeps its syntax ("phrase", or, -word); every lexeme
-- of 4+ letters is then stemmed and made a prefix ('kuvar':*).
CREATE OR REPLACE FUNCTION sr_search_query(input text) RETURNS tsquery
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE
  q text;
  lexeme_re constant text := '''(?:[^'']|'''')*''';
  parts text[];
  lexemes text[];
  word text;
  out text;
BEGIN
  q := websearch_to_tsquery('simple', sr_search_fold(input))::text;
  IF q = '' THEN
    RETURN ''::tsquery;
  END IF;
  parts := regexp_split_to_array(q, lexeme_re);
  lexemes := ARRAY(SELECT m[1] FROM regexp_matches(q, lexeme_re, 'g') AS m);
  out := parts[1];
  FOR i IN 1 .. coalesce(array_length(lexemes, 1), 0) LOOP
    word := sr_search_stem(replace(substr(lexemes[i], 2, length(lexemes[i]) - 2), '''''', ''''));
    out := out || '''' || replace(word, '''', '''''') || ''''
      || CASE WHEN length(word) >= 4 THEN ':*' ELSE '' END
      || parts[i + 1];
  END LOOP;
  RETURN out::tsquery;
END
$$;
