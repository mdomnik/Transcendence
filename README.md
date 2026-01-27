# QuizEverything

######  *AI-driven quiz game to challenge your friends in an online Quiz battle on any topic you can think of!*

> *This project has been created as part of the 42 curriculum by [mdomnik](https://github.com/mdomnik), [fjoestin](https://github.com/Fernandajo), [shkaruna](https://github.com/shehanish), [nmandakh](https://github.com/moojig12)*

## Description

  Quiz Everything is a quiz game, based on dynamic quiz generation through the use of artificial intelligence. Users can submit any topic they can think of from something as simple as **Animals** to something as complex as **Bee documentaries from the 2000's**. We aimed to provide our users with a unique experience of battling their friends on obscure topics you would rarely think of!

## Instructions

### Prerequisites

- Docker & Docker compose
- Git
### Setup

1. Fill out the env file with relevant information
2. Provide private key and certificate in /caddy
### Launching the Project

**Clone the repository**
`git clone git@github.com:mdomnik/Transcendence.git`

**One click Setup
`Make start`

## Resources

#### Readings

> For the competition of this project we used relevant documentation from the technologies used as well as youtube videos for initial understanding

1. [NestJS Documentation](https://docs.nestjs.com/)
2. [NextJS Documentation](https://nextjs.org/docs)
3. [Caddy Documentation](https://caddyserver.com/docs/)
4. [Redis Documentation](https://redis.io/docs/latest/)
5. [Prisma ORM Documentation](https://www.prisma.io/docs)
6. [NestJS Intro Course](https://www.youtube.com/watch?v=GHTA143_b-s&t=75s)
7. [Prisma, PostgreSQL, NestJS Tutorial](https://medium.com/@hrynkevych/prisma-orm-and-postgresql-with-nestjs-bf0a551fcaff)
8. [Auth Tutorial](https://www.youtube.com/watch?v=EFDUvzJT_wI)

### Use of AI

 >AI was used as a support tool during this project. It helped us understand technical concepts, clarify error messages, and suggest possible approaches when we were stuck. It was also used to rephrase and improve the clarity of some written explanations.
   All final code implemenations were created and verified by the team members. AI outputs were treated as suggestions and were reviewed, modified, or discarded when necessary 


## Team Information

#### Product Owner (PO): Mdomnik
	Resposible for the final calls on product features; What feature to keep and what to cut to keep with the schedule and scope
#### Project Manager (PM): Fjoestin
	Kept the team organized by planning frequent meetings, tracking individual progress and made sure everyone stuck to deadlines
#### Technical Lead (TL): Nmandakh
	Ensured that implmented features worked as expected and took the lead in reviewing critical code decisions
#### Design Lead (DL): Shkaruna
	Responsible for design choices of the project in terms of all graphical and branding choices
#### Developers: Mdomnik, Fjoestin, Nmandakh, Shkaruna
	All members contributed significantly by writing structured and thought-out code across all areas of the project

## Project Management

Throughout the entire development cycle, the team took part in daily check-ins and whole team bi-weekly meetings. For clear visualization of the project's progress and daily tasks we used tools such as github projects and miro for task-tracking and workflow visualization respectively. Clear communication was maintained by utilizing services of Discord and slack for meetings and 1-to-1 communication.


## Technical Stack

For the technical stack we used frameworks across both frontend and backend, an SQL database with an ORM, as well as a cache database. We chose Nest.js for the backend for its features and opinionated architecture. Next.js for modern and simple frontend development. PostgresSQL and Redis for quick access large-storage and temp storage respectively. Prisma for relational mapping in the DB. Docker, Caddy and Cloudflare, for simple and secure deployment.
#### Our Tech stack choices

 - Frontend: Next.js
 - Backend: Nest.js
 - Primary Database: PostgreSQL (PGVector) (For large data storage with quick access)
 - Database ORM: Prisma
 - Database Cache: Redis (for temporary data paramount to game logic)
 - Websockets: Socket.io
 - Webserver and Reverse-Proxy: Caddy
 - Encrypted transport layer: Cloudflare
 - Authentication: Passport.js
 - Containerization: Docker
 - Simplified setup: Make

## Database Schema

#### Visualization of our database structure

![[readmeFiles/schema.png]]




  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  

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

    - (e.g. "Lord of the rings" and "Lord   of   the Rings")

-  Split question pools over several different DB entries

-  Increased API usage and DB growth arising from duplicates

  

The Vector Embedding module was chosen to tackle all these problems by introducing semantic equivalence, allowing the system to group through meaning, rather than input strings

  

### Technical Challenges

  

1. **Semantic similarity detection**

    2. The Module converts topics strings into a set of 1536-dimensional embedding vectors using an external AI API. These vectors allow the system to find the semantic distance between topics instead of relying on user input.

    3.  A Similarity threshold is set to determine semantically relevant actions

        4.  < threshold = Topics are semantically similar; no new DB entry required

        5.  > threshold = Topics are distinct, create a new DB entry

6.  **Vector Database queries**

    7. The system runs nearest-neighbor searches against stored embeddings to find the closest match to the topic vector.

8.  **Topic Deduplication**

    9. Semantically equivalent topics are merged

    10. New topics are created only when semantically distinct

    11. Question Generation is consistently grouped under correct topic

12. **AI Integration**

    13. Input normalization and validation

    14. Strict Embedding format validation

    15. Rate limiting for AI requests

    16. Error handling for malformed requests

  
  

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

  

1.  `GET /api/topics`

    2.  Serves all quiz topics stored in the database

    3.  Requires API key

4.  `GET /api/topics/{topicId}`

    5. Serves all questions under the specified topic

    6. Requires API key

7. `POST /api/topics/`

    8. Creates a new topic if it does not exist

    9. Requires API key

    10. Requires Body as JSON format with "title" as a datapoint

    11. returns a **409 conflict**, if topic already exists

12. `PUT /api/topics/{id}`

    13. Updates existing topic with a new title

    14. Requires API key

    15. Requires Body as JSON format with "title" as a datapoint

16.  `DELETE /api/topics/{id}`

    17. Deletes a database entry with a specific Id

    18. Requires API key

  

### Non-Public Endpoints

  

Only the `api/topics` endpoints documented here are part of the **public API**.

All other endpoints on the `/api/` route are internal endpoints and use separate authentication systems.









































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