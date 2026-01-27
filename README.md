# QuizEverything

###  *AI-driven quiz game to challenge your friends in an online Quiz battle on any topic you can think of!*

> *This project has been created as part of the 42 curriculum by [mdomnik](https://github.com/mdomnik), [fjoestin](https://github.com/Fernandajo), [shkaruna](https://github.com/shehanish), [nmandakh](https://github.com/moojig12)*

## Description

  Quiz Everything is a quiz game, based on dynamic quiz generation through the use of artificial intelligence. Users can submit any topic they can think of from something as simple as **Animals** to something as complex as **Bee documentaries from the 2000's**. We aimed to provide our users with a unique experience of battling their friends on obscure topics you would rarely think of!

## Installation

1.  Clone the repository:

    ``` bash
    git clone git@github.com:mdomnik/Transcendence.git
    cd Transcendence
    ```

2.  Create the environment file:

    ``` bash
    cp .env.example .env
    ```

    Edit the file and fill in all required variables.

3.  Configure TLS:

    -   Place your private key and certificate files inside the `/caddy`
        directory as cert.pem and key.pem.

4.  Build and start the application:

    ``` bash
    make start
    ```

5.  Open in your browser:

        https://YOUR_DOMAIN_FROM_ENV

------------------------------------------------------------------------


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


## Features List

- User (Fjoestin)
  - Accounts & profiles — Users can create accounts and view their profiles
  - Friends - users can add, remove, and block friends
  - Messaging - users can talk to their friends through direct chat as well as a lobby chat in-game

- Authentication & Authorization (Fjoestin)
  - Passport.js auth — login/session handling
  - JWT/Bearer — secure internal API access
  - API key (X‑API‑KEY) — protect public Topics API
  - Rate limiting — throttle public endpoints
  - OAuth 2.0 - Google Authentication

- API (Mdomnik)
  - Public Topics API — CRUD API for DB information
  - Internal game endpoints — authenticated operations for matches

- Game Progression (Nmandakh & Mdomnik)
  - Phases — TOPIC_INPUT → VOTING_START → SELECT_TOPIC → ROUND_START → ANSWERING → ROUND_END
  - Topic submission - users can submit topics
  - Voting — players vote on proposals; UI shows counts
  - Answering - users select from a set of 4 answers to choose the correct one
  - Results overlay — end‑of‑match summary
 
- Real-time (Nmandakh)
   - Real-time events in lobby and game - socket.io implementation
   - chat real-time communication - websockets

- Topics / AI (Mdomnik)
  - Normalization & embeddings — convert topics to vectors for semantic match
  - Semantic deduplication — reuse canonical topics via nearest‑neighbor search
  - Canonical selection — threshold decides reuse vs create
  - AI question generation — optional auto‑generated question sets

- Data & Storage (Mdomnik & Fjoestin)
  - PostgreSQL + pgvector — store topics and embeddings
  - Prisma ORM — schema, migrations, data access
  - Redis — cache and temporary game state

- Frontend & UI (Shkaruna)
  - Next.js + React + TypeScript — app framework and components
  - Tailwind CSS — utility‑first styling and responsive UI
  - Animated cards/overlays — polished topic selection and reveal

- Deployment (Mdomnik)
  - Docker & Compose — containerized local/prod setup
  - Caddy reverse proxy — routing and HTTPS
  - Cloudflare TLS — secure transport
  - Env config — .env/.env.example driven settings

- Security & Reliability (Shkaruna & Fjoestin & Mdomnik)
  - Input validation — sanitize and validate requests
  - Error handling — robust API/AI call handling
  - Enforcement — API‑key checks and rate limiting

# Modules (27/14 points)
## Web (10 points)
### - Use a framework for both the frontend and backend (Major) (ALL)
We chose this module as we were looking forward to using frameworks across the project.
We chose to use NestJS in the backend and NextJS(React) in the frontend
### - Implement real-time features using WebSockets or similar technology (Major) (Nmandakh)
Utilized Socket.io for real-time communication between the frontend and backend to implement features such as lobby states, game states, chat, and invite notifications. Needed to have real-time features so effective and pleasent user experience, where the users can see game updates without having to fetch information again by themselves
### - Allow users to interact with other users (Major) (Fjoestin)
Having a communication system through a basic 1-on-1 chat and lobby chat system was a core part of the social game we were creating. To connect with users, it made sense that every user had their own profile and friends list, where he can add and remove friends
### - A public API to interact with the database with a secured API key, rate limiting, documentation, and at least 5 endpoints (Major) (Mdomnik)
This backend module exposes a public REST API for interacting with quiz topics stored on the database. It is designed for read/ write access to non-sensitive data and is protected by an API-key authentication and rate limiting.
All public endpoints exist under the /api/topics and are secured by an API key; All other /api/ endpoints exist for internal use and are protected via JWT "Bearer tokens" user authentication.
With an extensive database on information, having a publically accessible API is a nice addition
### - Use an ORM for the database (Minor) (MDomnik & Fjoestin)
Using an ORM helped us navigate complex relationships of information on the database. We implemented the relations using a prisma schema and modelling out each part of the relations
### - Custom-made design system with reusable components, including a proper color palette, typography, and icons (Minor) (Shkaruna)
We have created reusable components on the frontend, which helped us in developing all pages across the platform. It was implemented by creating custom reusable components
## Accessibility and Internalization (1 point)
### - Support for additional browsers (Minor) (ALL)
Creating safe and proper code allowed us to avoid any problems on most browsers.
## User Management (6 points)
### - Standard user management and authentication (Major) (Fjoestin)
For user profiles, we enables users to be able to change their username, upload a custom avatar, add other players, and have their own page with their information. We persist the user information on the database and retrieve it when called.
### - Game statistics and match history (Minor) (Fjoestin & Nmandakh)
Users can see their own personal match history and basic stats on their profile page. There is also a public leaderboard, which places you based on the amount of wins you have.
### - Implement remote authentication with OAuth 2.0 (Minor) (Fjoestin)
Implementation of remote authentication using passport.js and integrating google's auth services.
### - Advanced permissions system (Major) (Fjoestin & Mdomnik & Shkaruna)
Users can kick and ban players from lobbies. The party leader is the only one who can see those commands or change game settings. Everyone sees every user in the lobby as soon as they join.
## Artificial Intelligence (2 points)
### - Implement a complete LLM system interface (Major) (Mdomnik & Nmandakh)
Upon submitting a topic that either does not exist in the database or all users playing have seen answers to all the questions in that topic, the system will generate topics by making calls to an AI_API. It is done my formulating a full request to the AI and parsing and verifying the response. Rate limiting is implemented to avoid API abuse by players.
## Gaming and user experience (7 points)
### - Implement a complete web-based game where users can play against eachother (Major) (Nmandakh & Mdomnik & Shkaruna & Fjoestin)
Implemented a game where users can play together in an interactive ai-driven quiz game. Users win by scoring the most points by answering questions fast and correctly.
### -  Remote players — Enable two players on separate computers to play the same game in real-time (Major) (Nmandakh & Mdomnik)
Users can join a game together on seperate devices remotely through the internet, anywhere in the world. Any dropped connection is reestablished or dropped gracefully.
### - Multiplayer game (more than two players) (Major) (Nmandakh & Mdomnik)
Up to 24 players can join the game at once. By utilizing the voting and topic submission mechanic, the gameplay should be identical for all with no advantage to any specific player. Game states are synced across all clients on any state chagne done by any player.
###  - Game customization options (Minor) (Mdomnik)
The host is allowed to change the time to answer questions, the amount of questions, and the amount of rounds.
## Module of Choice - Vector Embedding (1 point) (Minor) (Mdomnik)
#### Overview
This project implements a custom **vector embedding** system that introduces semantic understanding of quiz topics inside the system. Instead of treating user input of topics as a literal string, this module helps us group semantically similar topics to automatically reuse or create database entries, through the use of AI-generated vector embeddings.

This module demonstrates skill of AI integration and database-level vector operations.

#### Why this module?

Normally quizzes rely on selecting a topic from a predetermined set of topics, which simplifies question group. However, since in our game anybody can generate quizzes on any topic, this makes a lot of issues become reality:

- duplicate topics with different wording

    - (e.g. "90s Tv shows" and "Television series from the 1990s")

- duplicate topics cause of different typing

    - (e.g. "Science" and "science)

    - (e.g. "Lord of the rings" and "Lord   of   the Rings")

-  Split question pools over several different DB entries

-  Increased API usage and DB growth arising from duplicates

The Vector Embedding module was chosen to tackle all these problems by introducing semantic equivalence, allowing the system to group through meaning, rather than input strings

#### Technical Challenges

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

  

# API USAGE
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
