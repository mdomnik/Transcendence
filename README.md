Start of the Transcendence Project

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