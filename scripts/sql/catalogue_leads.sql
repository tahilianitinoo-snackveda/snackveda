-- catalogue_leads — who downloaded the wholesale & export catalogue.
--
-- Spec point 20 asks for a downloadable catalogue; the request was to ask for a
-- name, phone and email before handing it over. That makes the catalogue a lead
-- magnet rather than a file, which is the point of having one.
--
-- WHAT THIS IS NOT
-- It is not a paywall. The details are collected once and the download happens
-- immediately afterwards -- there is no approval step and nothing to wait for. A
-- buyer who fills the form in gets the catalogue in the same click.
--
-- Idempotent. Safe to run twice.

BEGIN;

CREATE TABLE IF NOT EXISTS catalogue_leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    text        NOT NULL,
  email        text        NOT NULL,
  phone        text        NOT NULL,
  company_name text,
  country      text,
  interest     text,
  source_path  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- The admin list is "newest first", and the only other question anyone asks of
-- this table is "has this person been here before", by email.
CREATE INDEX IF NOT EXISTS catalogue_leads_created_at_idx ON catalogue_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS catalogue_leads_email_idx      ON catalogue_leads (email);

COMMIT;
