CREATE TABLE demand_responses (
  poll_id text NOT NULL CHECK (poll_id = 'platform-demand-v1'),
  poll_version smallint NOT NULL CHECK (poll_version = 1),
  credential_hash text NOT NULL CHECK (credential_hash ~ '^[0-9a-f]{64}$'),
  answer text NOT NULL CHECK (answer IN ('Підтримую', 'Не підтримую', 'Утримуюсь')),
  PRIMARY KEY (poll_id, credential_hash)
);
