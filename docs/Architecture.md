# Archtecture Design
## 1. Architecture Diagram
<img width="6004" height="2568" alt="Image" src="https://github.com/user-attachments/assets/951a64ce-bf5c-42a0-96fa-c4c3548b74de" />

## 2. Component overview
SpendSense is divided into four main layers:
### 2.1. Presentation Layer
- **Components:** React + Typescript frontend, dashboard, callendar, gamification ui.
- **Responsibilities:** Capture user interactions, display obligations, display payments, show gamification stause, and notifications.
- **External interfaces:** API calls to NestJS backend, JWT authentication via Supabase.
### 2.2. Access Layer
- **Components:** NestJS controller.
- **Responsibilities:** Handle HTTP requests, validate user input, call domain services, manage authentaction via jWT.
- **Flow:** Receives user actions -> invokes domain services -> returns structured response.
### 2.3. Service layer
- **Components:** Domain services(Financial obligation service, payment logging service, gamification service, user profile)
- **Reasponsibilities:** Encapsulate service logic:
	- **Financial Obligations**: Create, update, delete, and retrieve obligations.
	- **Payments**: Validate and log payments, update statuses.
	- **Gamification**: Credit score calculation, coin/badge assignment, streak tracking.
### 2.4 Data Layer
- **Components:** PostgrSQL via supabase.
- **Responsibilities:** Contain user data(obligations,payments,gamification), enforce constraints.
### 2.5. Supporting services
- **Auth Provider:** Supabase for authentication with JWT.
- **Email/Notification Service:** internal reminders.
# 3. Architectural patterns
- **Layered Architecture:** Presentation -> Access -> Service -> data.
- **Domain-driven Design:** Each service encapsulates a domain concept:
	- Financial obligations
	- Payments
	- Gamifications
- **Schema-firstdatabase Development:** Prisma schema acts as a single source of truth for the db.
# 4. Design Patterns
- **Observer:** Gamification updates and notifications can be triggered based on payment or obligation changes.
# 5. Architecture constraints
### 5.1. Environment constraints
- Development must mirror production as closely as possible.
- Docker used for all local and production services.
### 5.2 Technology Constraints
- React + TypeScript for frontend, NestJS for backend.
- PostgreSQL via Supabase for database.
- Prisma schema-first approach.
### 5.3. Operational Constraints
- Soft-deletes only, no hard deletions in production.
- Never overwrite live data.
### 5.4. Security and compliance
- All communication must be over HTTPS.
- JWT authentication for backend endpoints.
- Sensitive data encrypted; passwords never stored in plaintext.
