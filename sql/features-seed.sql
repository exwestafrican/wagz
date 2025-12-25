INSERT INTO "Feature" (id, name, votes, icon, stage, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'WhatsApp inbox integration',           0, 'message-square', 'PLANNED',       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Receive Gmail emails in your inbox',   2, 'mail',           'IN_PROGRESS',   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Send and receive images in chat',      1, 'image',          'IN_PROGRESS',   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Receive Instagram messages in your inbox', 3, 'message-square', 'IN_PROGRESS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
