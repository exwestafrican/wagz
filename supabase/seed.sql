INSERT INTO "Feature" (id, name, votes, icon, stage, "createdAt", "updatedAt")
VALUES
  ('b4dfec35-1c7f-4f6d-8f87-8bcd766df26c', 'whatsApp inbox integration',           0, 'message-circle', 'PLANNED',       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'receive Gmail emails in your inbox',   1, 'mail',           'IN_PROGRESS',   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'send and receive images in chat',      3, 'image',          'IN_PROGRESS',   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'receive Instagram messages in your inbox', 2, 'message-square', 'IN_PROGRESS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
