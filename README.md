Start of the Transcendence Project

# Quiz Module / Vector Embedding - Module of Choice

## Overview

This project implements a custom **vector embedding** system that introduces semantic understanding of quiz topics inside the system. Instead of treating user input of topics as a literal string, this module helps us group semantically similar topics to automatically reuse or create database entries, through the use of AI-generated vector embeddings.

This module demonstrates skill of AI integration and database-level vector operations.

### Why this module?

Normally quizzes rely on selecting a topic from a predetermined set of topics, which simplifies question group. However, since in our game anybody can generate quizzes on any topic, this makes a lot of issues become reality:
- duplicate topics with different wording
	- (e.g. "90s Tv shows" and "Television series from the 1990s")
- duplicate topics cause of different typing
	- (e.g. "Science" and "science)
	- (e.g. "Lord of the rings" and "Lord   of   the Rings")
-  Split question pools over several different DB entries
-  Increased API usage and DB growth arising from duplicates

The Vector Embedding module was chosen to tackle all these problems by introducing semantic equivalence, allowing the system to group through meaning, rather than input strings

### Technical Challenges

1. **Semantic similarity detection**
	1. The Module converts topics strings into a set of 1536-dimensional embedding vectors using an external AI API. These vectors allow the system to find the semantic distance between topics instead of relying on user input.
	2.  A Similarity threshold is set to determine semantically relevant actions
		1.  < threshold = Topics are semantically similar; no new DB entry required
		2.  > threshold = Topics are distinct, create a new DB entry
2.  **Vector Database queries**
	1. The system runs nearest-neighbor searches against stored embeddings to find the closest match to the topic vector.
3.  **Topic Deduplication**
	1. Semantically equivalent topics are merged
	2. New topics are created only when semantically distinct
	3. Question Generation is consistently grouped under correct topic
4. **AI Integration**
	1. Input normalization and validation
	2. Strict Embedding format validation
	3. Rate limiting for AI requests
	4. Error handling for malformed requests


# Public API

## Overview

This backend module exposes a public REST API for interacting with quiz topics stored on the database. It is designed for read/ write access to non-sensitive data and is protected by an API-key authentication and rate limiting.

All public endpoints exist under the /api/topics and are secured by an API key; All other /api/ endpoints exist for internal use and are protected via JWT "Bearer tokens" user authentication.

### API Key Authorization

All public API endpoints require an API key to be provided in the request headers.
```
[Headers]
X-API-KEY: <access-api-key>
```

If not provided, the program will return a **401 Unauthorized** error, along with a message:
`Invalid API key`

### Rate Limiting

Public API endpoints are rate limited to prevent spam with a limit of 10 requests per minute per ip.
Otherwise, an error of **429 Too many Requests**, will be showed.

### Resource

The API allows access to non-sensitive information our database collects: User Created **Quiz Topics.** Each topic has a unique title, enforced by the database

### Endpoints

There are 5 exposed endpoints across all 4 CRUD request types

1.  `GET /api/topics`
	1.  Serves all quiz topics stored in the database
	2.  Requires API key
2.  `GET /api/topics/{topicId}`
	1. Serves all questions under the specified topic
	2. Requires API key
3. `POST /api/topics/`
	1. Creates a new topic if it does not exist
	2. Requires API key
	3. Requires Body as JSON format with "title" as a datapoint
	4. returns a **409 conflict**, if topic already exists
4. `PUT /api/topics/{id}`
	1. Updates existing topic with a new title
	2. Requires API key
	3. Requires Body as JSON format with "title" as a datapoint
5.  `DELETE /api/topics/{id}`
	1. Deletes a database entry with a specific Id
	2. Requires API key

### Non-Public Endpoints

Only the `api/topics` endpoints documented here are part of the **public API**.
All other endpoints on the `/api/` route are internal endpoints and use separate authentication systems. 