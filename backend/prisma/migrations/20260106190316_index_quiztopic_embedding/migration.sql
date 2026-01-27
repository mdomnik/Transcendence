CREATE INDEX IF NOT EXISTS quiztopic_embedding_idx
ON "QuizTopic"
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
