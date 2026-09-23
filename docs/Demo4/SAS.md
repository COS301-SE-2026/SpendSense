# SpendSense: Software Architecture Specification (SAS)

## 1. Table of Contents

* [2. Introduction](#2-introduction)
* [3. Architectural Requirements](#3-architectural-requirements)
  * [3.1 Architectural Patterns](#3-1-architectural-patterns)
    * [3.1.1 4-Tier Layered Architecture](#3-1-1-4-tier-layered-architecture)
    * [3.1.2 Client–Server Architecture](#3-1-2-client-server-architecture)
    * [3.1.3 Modular Monolith](#3-1-3-modular-monolith)
    * [3.1.4 Model–View–ViewModel](#3-1-4-model-view-viewmodel)
  * [3.2 Design Patterns](#3-2-design-patterns)
    * [3.2.1 Factory Method](#3-2-1-factory-method)
    * [3.2.2 Factory Method with Template Method](#3-2-2-factory-method-with-template-method)
    * [3.2.3 Observer](#3-2-3-observer)
    * [3.2.4 Adapter](#3-2-4-adapter)
    * [3.2.5 Facade](#3-2-5-facade)
  * [3.3 Constraints](#3-3-constraints)
  * [3.4 Architecture Diagram](#3-4-architecture-diagram)
  * [3.5 Mapping Quality Requirements to Architectural Decisions](#3-5-mapping-quality-requirements-to-architectural-decisions)
* [4. Technology Requirements](#4-technology-requirements)
* [5. Service Contracts](#5-service-contracts)
* [6. Deployment](#6-deployment)
  * [6.1 Deployment Requirements](#6-1-deployment-requirements)
    * [6.1.1 One-time setup](#6-1-1-one-time-setup)
    * [6.1.2 GitHub Actions secrets](#6-1-2-github-actions-secrets)
    * [6.1.3 First deployment and updates](#6-1-3-first-deployment-and-updates)
  * [6.2 Deployment Diagram](#6-2-deployment-diagram)
    * [6.2.1 Systems used](#6-2-1-systems-used)
    * [6.2.2 Deployment nodes](#6-2-2-deployment-nodes)
    * [6.2.3 Communication paths](#6-2-3-communication-paths)
  * [6.3 CI/CD Pipeline Diagram](#6-3-ci-cd-pipeline-diagram)
    * [6.3.1 Branching flow](#6-3-1-branching-flow)
    * [6.3.2 Development CI](#6-3-2-development-ci)
    * [6.3.3 Release qualification](#6-3-3-release-qualification)
    * [6.3.4 Production deployment](#6-3-4-production-deployment)
    * [6.3.5 Deployment artefacts and target environments](#6-3-5-deployment-artefacts-and-target-environments)
    * [6.3.6 Health checks and failure handling](#6-3-6-health-checks-and-failure-handling)

---

<a id="2-introduction"></a>

## 2. Introduction

This Software Architecture Specification serves the purpose of describing the architecture of SpendSense system along with its structure and component interactions. This specification documents the architecture of the system based on the architecture decisions that define the process of its development. The goal of this document is also to show how the selected architecture meets the functional and non-functional requirements specified in the Software Requirements Specification.

The current version of SpendSense is described in this document including its architectural styles and patterns, system components, technologies used in development of the system, interfaces and API contracts, data management, security, deployment environment, inter-subsystems communications and roles of the components.

Both of the specifications mentioned above need to be taken into account during the analysis of the project. Thus, the Software Requirements Specification specifies the goals of the system based on its scope, user stories, use cases, functional and non-functional requirements and domain model while the Software Architecture Specification describes its implementation.

<a id="3-architectural-requirements"></a>

## 3. Architectural Requirements

<a id="3-1-architectural-patterns"></a>

### 3.1 Architectural Patterns

Several architectural patterns are used in SpendSense. First of all, there is the use of an 4-Tier architecture for the entire system. The client-server pattern specifies the interaction pattern between the frontend and the backend layers. At the same time, there is a modular monolith that is used to structure the backend business functionality.
In the Presentation layer, the Model–View–ViewModel pattern is used.

<a id="3-1-1-4-tier-layered-architecture"></a>

#### 3.1.1 4-Tier Layered Architecture

**Purpose:** The intention behind the layered architecture is to split up the system into layers of distinct responsibility. The SpendSense system is based on the N-tier architecture with four layers: the Presentation Layer, Access Layer, Service Layer, and Data Layer. In addition, every layer takes care of performing a certain kind of task in cooperation with its neighboring layers.

**Why the pattern was selected:** SpendSense has its user interface functionality, request handling, financial business logic, and persistence tasks implemented in the system. The combination of all these aspects in a single component will complicate the system in terms of understanding, testing, and modification. Hence, the N-tier architectural pattern was chosen as it provides separation of concerns and minimizes the impact of changes in the system.
The N-tier pattern is also a good choice as SpendSense is an interactive system where the user initiates some action through the interface and gets a suitable response from the system for the performed request. Interactive systems are related to an N-tier architecture and client-server interaction model according to the lecture materials.

**Structure and application in SpendSense:** The four layers are used as follows:

* Presentation Layer presents information, receives user input, and processes frontend presentation states.
* Access Layer contains controllers that process frontend requests, check the correctness of input data, do access checks, and forward request to the Service Layer.
* Service Layer contains business logic components, including financial obligations, payment history processing, scoring, statistics and insights, quizzes, notifications and reminders, gamification and rewards, and user profiles management.
* Data Layer takes care of information persistence and retrieval for users, obligations, payments, quizzes, rewards, notifications, and user profiles.

A regular flow starts at Presentation Layer and proceeds to Access Layer controller. Access Layer controller forwards the operation to the appropriate Service Layer component. The service processes the business logic and uses Data Layer when information needs to be stored or retrieved.

**Quality attributes supported:** The following qualities are facilitated using the four-layer architecture approach:

* *Maintainability:* roles are segregated, thus making any changes possible locally at the particular layer level.
* *Modifiability:* any changes in the layer’s implementation details may be possible without affecting the other layers as long as their interfaces are left unchanged.
* *Testability:* controllers, services, and frontend features can be tested independently, while dependencies may be substituted with mocks.
* *Security:* authentication, authorization, validation, and business rules can be applied before persistent data access.
* *Scalability:* frontend, backend, and data hosting parts can be independently deployed and scaled in environments that support this.
* *Reusability:* functionality of the Service Layer may be used by different controllers and frontend processes.

**Trade-offs and limitations:** Adding layers adds to the number of components that the request needs to go through. This could lead to code and even more indirection and complexity of ideas. Simple actions might need the addition of a frontend component, API, a controller, a service action, data-access and finally the response model.
However, the pattern will work effectively when there is consistency in the application of its boundaries. For instance, when there are business rules in the frontend component, there is no use of services while accessing the database in controllers and one service accessing the other module’s inner workings.
This kind of abstraction increases maintainability and testability of the code, but also leads to overhead and makes the code harder to understand by new programmers. The separation and abstraction localize change but can add more layers and overhead.

<a id="3-1-2-client-server-architecture"></a>

#### 3.1.2 Client–Server Architecture

**Purpose:** The purpose of the client-server architecture is to separate the application, which deals with the client end, from the central server that will process all the business logic and security and manage all the accesses to data.

**Why the pattern was selected:** SpendSense is a web application in which the user interacts via the frontend and, at the same time, needs to have its financial rules and data controlled centrally. With the use of the client-server architecture, the frontend part can focus on the user interactions and rendering while the backend will take control of the authentication, validation, financial computations, payments, quiz settlement, notifications, and access to the storage data.
It is very important to centralize these operations to prevent rules implementation only in the client part.

**Structure and application in SpendSense:** React and TypeScript are used for the frontend of the system. This part shows the application screens to the user, processes user inputs, keeps track of presentation state, and performs HTTP requests to the backend API.
NestJS is used for the backend of the system. This part acts as the server that listens to the client requests and calls the corresponding services.
For example, when a user logs a payment, the frontend passes information about the payment to the backend. The backend then checks the request, adds a new payment, changes the payment frequency, computes new financial and gamification information, and returns the information back to the frontend.
Quality attributes supported:Quality Attributes supported by the client-server architecture include:

* *Security:* Financial and data access policies are contained on the server side, not the client.
* *Maintainability:* Frontend and backend components can be changed independently, provided the API agreement stays the same.
* *Scalability:* Client delivery and server processing can be scaled independently.
* *Consistency:* The client accesses consistent central business rules and data.
* *Usability:* The client can deliver responsive UI and the server deals with complex processing.
* *Integrability:* Outside systems deal with controlled backend interfaces, not with the frontend or database directly.

**Trade-offs and limitations:** Availability of the backend server and its connectivity to the frontend is required for proper functioning of the frontend. If the backend service is down, then most of the functions of SpendSense cannot be performed although the frontend application itself is available.
Latency and potential failures can occur through network communication. In order to ensure that the client and the server can continue communicating properly, the API contract needs to be managed appropriately.
The server could turn out to be a bottleneck in performance or single point of failure due to inadequate monitoring, replication, and scaling. There are some considerations that need to be kept in mind during separation of the client and server side applications.

<a id="3-1-3-modular-monolith"></a>

#### 3.1.3 Modular Monolith

**Purpose:** The purpose for a modular monolith is to split the backend into business capability-based modules but still have one backend application and one backend deployment. Each module is responsible for its area and has controlled interfaces to the rest of the application.

**Why the pattern was selected:** SpendSense has several functional blocks, including obligations, payments, credit scoring, notifications, quizzes, gamification, insights, and profiles. These blocks should have clearly defined boundaries to allow developers to work and test them separately from other backend functionality.
But at this point, the scope of the project and the size of the development team do not require the overhead of deploying microservices independently of each other. A modular monolith will provide separation of concerns but does not require multiple backend deployments, distributed transactions, service discovery, message brokers, and inter-service networking.

**Structure and application in SpendSense:** The SpendSense backend is created with the help of one NestJS application that includes modules for major business functionalities of the system. The major ones include:

* User Profile
* Financial Obligation
* Payment Logging and Management
* Credit Score
* Gamification and Rewards
* Notifications and Reminders
* Quiz
* Insights and Analytics

Each module holds all the controllers, services, data transfer objects, validators, and other logic needed for this functionality. Modules can interact via their service interfaces in case when one business process affects another.
For example, logging a payment requires Payment module, Credit Score module, Gamification module, and Notifications module. While the interaction takes place between those modules, they belong to one backend application and can participate in database operations together without any networking between different services.

**Quality attributes supported:** The quality attributes of the modular monolith include the following:

* *Maintainability:* related business capabilities are encapsulated in specific modules.
* *Modifiability:* modifications are limited to the affected module.
* *Testability:* each module can be tested separately.
* *Reliability:* multi-module operations can be managed through one application/database transaction.
* *Performance:* communication between the modules happens via local in-process method calls.
* *Deployability:* deployment of a single backend application replaces deployment of many distributed services.
* *Understandability:* module structure is based on business capabilities and use cases of SpendSense.

**Trade-offs and limitations:** All modules being one deployment for the backend, they cannot be independently deployed and scaled. Failure of the backend process can impact all modules instead of impacting just one business capability.
This architectural approach also assumes that internal boundaries are respected. If there are no well-defined module interfaces, developers will most likely end up building a tight coupling of a monolith.
With growing application size, build, test, and deployment processes will take more time. Shared database will let developers have access to the data of one module from the other, if they violate ownership principles.
Despite these downsides, this architecture consciously takes all those risks to gain an easier development, testing, deployment, transactions, and monitoring processes. If the current modules were split into microservices, then the developer would deal with a network failure, distributed-data consistency, authentication, deployment, and other problems, which are unnecessary now.

<a id="3-1-4-model-view-viewmodel"></a>

#### 3.1.4 Model–View–ViewModel

**Purpose:** The purpose of the Model-View-ViewModel design is to seperate the UI and its state from the logic of interaction and the models of data representation. Otherwise, the View will have to do both UI and all the other operations.

**Why the pattern was selected:** In SpendSense, there are interactive views with states of loading, user interaction, validation, filtering, navigation, API calls, and changing finance data. It would complicate the frontend greatly if that code were to be added to UI elements directly.
MVVM pattern was chosen to make the roles of the frontend clear where the View deals with rendering UI and handling user interaction and the ViewModel handles the frontend behavior and interaction with the Model.

**Structure and application in SpendSense:** The following are the MVVM responsibilities in practice:

* *The View* is made up of React pages and reusable view components. This part shows the data and passes user actions to the ViewModel.
* *The ViewModel* includes presentation logic, hooks, form management, validation, event handling, and coordination with the API. It prepares the data to be shown by the View.
* *The Model* contains frontend data types, domain models, API requests, and API responses sent by the backend.

The View doesn't communicate directly with the backend controllers. User actions are processed by the ViewModel, which performs the necessary frontend API calls and updates the presentation state based on the server's reply.
For example, on the Notifications page, the View shows the notifications list, the filters, the loading state, and the unread notifications status. The ViewModel is responsible for loading notifications, applying the type filter, reading notifications, handling errors, and updating the displayed data. The Model contains notification types, API responses, pagination info, and read status values.

**Quality attributes supported:** The MVVM approach enables the following quality attributes:

* *Maintainability:* presentation layer and visual layout can be changed independently.
* *Testability:* logic of ViewModels can be tested independently from rendered UI elements.
* *Modifiability:* coordination between APIs or state management logic can be modified without changing View.
* *Reusability:* ViewModels, hooks, models, and visual parts can be used repeatedly in different pages.
* *Usability:* predictable handling of presentation states makes possible proper loading, success, empty, and failure states.
* *Understandability:* developers find it easier to determine which part is responsible for visual aspects, behaviour, and data.

**Trade-offs and limitations:** With MVVM there is an extra level of abstraction between the View and the backend system. What was once a simple page will need separate pieces for hooks, components, models and API calls, making more files and abstractions.
It is also possible to have confusion between the View and the ViewModel when using React due to hooks and component code being written in the same file. For that reason, the MVVM architecture has to be strictly adhered to, not by using separate files, but through naming conventions and responsibilities.
Incorrectly developed ViewModels can grow too big and start including business rules which should stay in the backend Service Layer. The ViewModel on the client side is responsible for presentation logic only, while business rules and financial calculations should take place in the backend.

<a id="3-2-design-patterns"></a>

### 3.2 Design Patterns

<a id="3-2-1-factory-method"></a>

#### 3.2.1 Factory Method

The factory method is used in end-to-end testing infrastructure, specifically within the mock object test factories. The test setup utilized the dedicated factory files to instantiate and populate the standardised test objects on demand. This provides a clean,  standard mock object generation pipeline for testing without hardcoding objects across test suits. It simplifies test data setup, prevents duplication and ensures consistency across the test cases.

<a id="3-2-2-factory-method-with-template-method"></a>

#### 3.2.2 Factory Method with Template Method

The factory method combined with the template method is used for the users, if a user doesn't exist, the factory uses the template to create the user. This is done to centralize the multi-table initialization logic into a repeatable template structure. It ensures that when a new user is made all of its required entities are instantiated reliably without spreading the logic.

<a id="3-2-3-observer"></a>

#### 3.2.3 Observer

The observer design pattern is used in the notifications, since there is a notifications listener that continuously monitors the notifications endpoint for updates. when a new notification arrives, it automatically has a popup notification on the user interface. The purpose of this is to ensure that the user interface seamlessly reacts with real-time notifications and reminders in one central place without requiring manual page reloads or scattered event handling across components.

<a id="3-2-4-adapter"></a>

#### 3.2.4 Adapter

The `apiFetch` container acts as an adapter design pattern as it automatically unwraps the backend standard response containers into clean domain objects expected by the frontend. This is done to standardize the backend response structures and provides typed models to callers which isolates the details from the application logic.

<a id="3-2-5-facade"></a>

#### 3.2.5 Facade

The `use<Operation>Session` hooks operate as the facade design pattern, this encapsulates multiple API endpoints, internal state tracking and cancelled requests behind a single simplified API. This provides a unified interface for UI components without exposing the underlying API complexity to the UI layer.

<a id="3-3-constraints"></a>

### 3.3 Constraints

|Constraint|Architecutral Consequence|Why?|
|---|---|---|
|The project must be done with a zero-cost budget| Spendsense uses free services such as supabase, and the free AWS tier for deployment | Our client told us to use free services everywhere possible.|
|SpendSense cannot calulate a real credit score| Our simulated credit score is based on alot of research. | How banking institutions caluclate credit scores for customers is propriatary, and therefore we do not have access to that.|
|Notifications are limited to in-app delivery for demo 2| All notifications on our web app are shown through the in-app inbox.|This was done due to time constraints, but in future demos we do plan to include email notifications.|


<a id="3-4-architecture-diagram"></a>

### 3.4 Architecture Diagram

<img src="./images/ArchitectureDiagram.jpeg"/>

<a id="3-5-mapping-quality-requirements-to-architectural-decisions"></a>

### 3.5 Mapping Quality Requirements to Architectural Decisions
| SRS requirement | Quality attribute | Architectural and technology decisions | How the decision satisfies the requirement |
|---|---|---|---|
| NFR1.1 | Security | Supabase Authentication; client-server architecture; protected page handling and backend authentication checks | Authentication is centralised through Supabase. Protected requests are accepted by the backend only when a valid authenticated session is supplied, while unauthenticated users are prevented from accessing protected application functions. |
| NFR1.2 | Security | JWT validation in the Access Layer before controller operations are forwarded to the Service Layer | Every protected API request is checked before business logic is executed. Missing, malformed, invalid, or expired tokens are rejected at the system boundary. |
| NFR1.3 | Security | Server-side authorisation; user-scoped service and data-access operations; four-tier separation | The authenticated user identity is used by the backend when retrieving or changing data. Ownership checks remain in the Access and Service Layers rather than relying on a user identifier supplied by the client, preventing cross-account access and modification. |
| NFR1.4 | Security | Request validation in the Access Layer; typed request models; Service Layer business-rule validation | Incoming values and supported fields are validated before database operations occur. Invalid requests are rejected before they can change persisted information. |
| NFR1.5 | Security | Amazon CloudFront HTTPS endpoint for the frontend; Caddy reverse proxy providing HTTPS for the backend API | Browser traffic to the deployed frontend and API is transmitted over HTTPS. Internal container communication remains isolated within the EC2 Docker network. |
| NFR1.6 | Security | Environment variables; GitHub Actions repository secrets; excluded production environment files; Gitleaks secret scanning | Credentials and deployment secrets are supplied at deployment time instead of being committed to source control. The CI pipeline scans the repository and blocks a release when exposed credentials are detected. |
| NFR2.1 | Portability | Docker images for the backend and supporting services | Application services are packaged together with their runtime dependencies, allowing the same container images to run consistently in development, testing, and production environments. |
| NFR2.2 | Portability | Docker Compose production configuration | Docker Compose defines the production services, networks, environment configuration, and startup process as one repeatable deployment unit. The configuration is validated in CI before release. |
| NFR2.3 | Portability | Environment variables, `.env.production`, and GitHub Actions deployment secrets | Environment-specific URLs, credentials, origins, ports, and service addresses can be changed without modifying application source code. |
| NFR2.4 | Portability | `/api/v1/health` endpoint; post-deployment health check; authenticated frontend-to-backend smoke test | A deployment is not treated as operational until the backend responds successfully and a protected flow confirms that the frontend, backend, CORS configuration, authentication, and database connection work together. |
| NFR3.1 | Maintainability | ESLint rules for the frontend and backend; lint checks in GitHub Actions | Static code-quality rules are applied consistently. Pull requests and releases cannot qualify while required lint checks contain errors. |
| NFR3.2 | Maintainability | Four-tier layered architecture; client-server architecture; backend Service Layer | Financial calculations and business rules are centralised in backend services. React ViewModels coordinate presentation behaviour but do not implement authoritative financial rules. |
| NFR3.3 | Maintainability | NestJS modular monolith organised by business capability | Obligations, payments, credit scoring, gamification, notifications, quizzes, insights, and profiles are separated into responsible modules. Changes are therefore localised to the relevant module and its tests. |
| NFR3.4 | Maintainability | GitHub Actions CI/CD pipeline with lint, test, build, end-to-end, and migration gates | Automated checks run before merging and deployment. A failed required check prevents code from progressing to the next branch or production environment. |
| NFR3.5 | Maintainability | Docker and Docker Compose development and test environments; CI Docker validation | Developers and CI use repeatable service definitions. `docker compose config` and image builds verify that the environment remains reproducible. |
| NFR4.1 | Availability | AWS-hosted deployment; CloudFront delivery; EC2 service hosting; Docker-managed services; AWS CloudWatch monitoring | The deployment architecture supports continuous operation and measurement of availability. CloudWatch evidence recorded 99.96% availability over the SRS monitoring period, exceeding the required 99.9%. |
| NFR4.2 | Availability | Dedicated backend `/api/v1/health` endpoint | The running state of the backend can be checked directly by deployment automation and operational monitoring. |
| NFR4.3 | Availability | Staged GitHub Actions pipeline; required build, test, migration, and health-check dependencies | Production deployment proceeds only after required jobs succeed. Failed builds, tests, database migrations, or deployment health checks prevent a release from being accepted as operational. |
| NFR4.4 | Availability | AWS CloudWatch availability monitoring and downtime records | Monitoring provides evidence of the observation period and recorded downtime, allowing the availability percentage to be calculated and compared with the target. |
| NFR5.1 | Usability | React presentation layer; MVVM separation; reusable views and ViewModels; help and support content | Core tasks are presented through focused interfaces, while presentation logic handles loading, validation, success, empty, and error states consistently. This supports first-time task completion without facilitator assistance. |
| NFR5.2 | Usability | Consistent client-server workflows; typed API models; frontend validation and backend validation; end-to-end user-flow testing | Clear workflows and validation reduce failed task attempts. Playwright and manual usability tests verify whether users can complete the required core tasks successfully. |
| NFR5.3 | Usability | Controlled error handling in ViewModels and backend services; validation before persistence; recoverable UI states | Invalid actions are rejected with feedback instead of leaving the application in an unrecoverable state. Server-side validation protects stored data while the UI allows the user to correct input or retry an operation. |
| NFR5.4 | Usability | MVVM presentation structure; reusable React components; consistent navigation and feedback patterns | Separating visual components from interaction logic supports a predictable interface that is easier to learn and use. The required ease rating remains a usability-test acceptance measure rather than an architectural guarantee. |
| NFR5.5 | Usability | Manual usability test sessions and documented test observations | Navigation pauses, misclicks, and requests for assistance are recorded during usability testing. The findings can be traced back to the affected View, ViewModel, or workflow for correction. |

<a id="4-technology-requirements"></a>

## 4. Technology Requirements
SpendSense uses the following technologies to implement, test, deploy, and monitor the system.

| Technology | Use in SpendSense | Related requirements |
|---|---|---|
| React | Builds the user interface and reusable components. | Supports usability and the Presentation Layer. |
| TypeScript | Provides typed frontend and backend code. | Supports maintainability and reduces integration errors. |
| Vite | Builds the React frontend for deployment. | Supports repeatable frontend deployment. |
| NestJS | Implements the backend API, services, validation, and business modules. | Supports NFR3.2 and NFR3.3. |
| Node.js 20 | Runs the NestJS backend. | Supports consistent development and production environments. |
| Prisma | Provides database access and manages migrations. | Supports maintainability and controlled data access. |
| Supabase PostgreSQL | Stores SpendSense application data. | Provides persistent relational storage. |
| Supabase Authentication | Authenticates users and issues JWTs. | Supports NFR1.1, NFR1.2, and NFR1.3. |
| FastAPI and Python 3.11 | Runs the optional supporting AI service. | Core features must still work when it is unavailable. |
| Docker | Packages services and dependencies into containers. | Supports NFR2.1 and NFR3.5. |
| Docker Compose | Starts and manages the required containers. | Supports NFR2.2. |
| Caddy | Routes API requests and provides HTTPS. | Supports NFR1.5. |
| Amazon S3 and CloudFront | Host and deliver the frontend over HTTPS. | Support secure and independent frontend deployment. |
| Amazon EC2 | Hosts the production backend containers. | Provides the backend production environment. |
| AWS CloudWatch | Monitors system availability and downtime. | Supports NFR4.1 and NFR4.4. |
| GitHub | Provides source control and collaboration. | Supports controlled development changes. |
| GitHub Actions | Lints, tests, builds, scans, deploys, and verifies the application. | Supports NFR3.4 and NFR4.3. |
| ESLint | Checks code quality rules. | Supports NFR3.1. |
| Gitleaks | Checks for committed credentials and secrets. | Supports NFR1.6. |
| Playwright | Tests important user workflows. | Supports integrated and usability testing. |
| Environment variables and deployment secrets | Store settings and secrets outside the source code. | Support NFR1.6 and NFR2.3. |
| `/api/v1/health` endpoint | Confirms that the backend is running. | Supports NFR2.4 and NFR4.2. |

### 4.1 Technology Usage Constraints

The chosen technologies will be used in the following constraints:

* The frontend will not make any authoritative financial calculations nor access the database of the application directly. The business logic will be implemented in NestJS services.
* The protected backend endpoints will authenticate using Supabase JWTs and will scope the data access to the current user.
* The application data will be accessible via backend and Prisma-managed Data Layer.
* The communication of the browser-side frontend and API will happen over HTTPS in the deployment environment.
* The environment-specific values and secrets will be provided using environment variables or deployment secrets storage and won't be checked into the repository.
* The Docker and Docker Compose configuration will be valid for the development, testing, and production usage.
* All linting, testing, building, secret scan, migration, and health check requirements must pass before accepting the production deployment.
* The optional supporting services will not hinder the usage of core functionality of SpendSense in case these services are not available.

<a id="5-service-contracts"></a>

## 5. Service Contracts

Due to the length of the document please see the API contrace here: [openapi.yml](./serviceContracts/openapi.yml)


<a id="6-deployment"></a>

## 6. Deployment

<a id="6-1-deployment-requirements"></a>

### 6.1 Deployment Requirements

<a id="6-1-1-one-time-setup"></a>

#### 6.1.1 One-time setup

1. Create a Supabase project. Copy its database connection string, project URL, anon key, and JWT secret. Configure the required sign-in methods in Supabase Auth.
2. In AWS, create a private S3 bucket for the frontend and a CloudFront distribution with the bucket as its origin. Configure CloudFront to return `/index.html` for 403 and 404 responses so React routes work on refresh.
3. Create an Ubuntu EC2 instance with a static public IP. Allow inbound ports 80 and 443 from the internet. Restrict SSH port 22 to the team network. Install Git, Docker Engine, and the Docker Compose plugin.
4. Point an API DNS record such as `api.example.com` to the EC2 public IP. If a custom frontend domain is used, add it to CloudFront and create the required DNS record and certificate.
5. Clone the repository on EC2 to `/app/spendsense`. Create `/app/spendsense/.env.production` with the server values below, then run `chmod 600 .env.production`.

```env
DATABASE_URL=<Supabase PostgreSQL connection string>
PORT=3000
AI_SERVICE_URL=http://ai:8000
SUPABASE_URL=<Supabase project URL>
SUPABASE_JWT_SECRET=<Supabase JWT secret>
ALLOWED_ORIGINS=<CloudFront or frontend domain URL>
CADDY_HOSTNAME=api.example.com
CADDY_ACME_EMAIL=<team contact email>
SCHEDULER_SECRET=<strong random value>
```

`SCHEDULER_SECRET` is needed only when the protected scheduled-job endpoint is used. Do not commit `.env.production` or any secret values.


<a id="6-1-2-github-actions-secrets"></a>

#### 6.1.2 GitHub Actions secrets

Add these repository secrets before the first deployment.

| Secret | Purpose |
|---|---|
| `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` | IAM credentials with access to the frontend S3 bucket and CloudFront invalidation. |
| `S3_BUCKET_FRONTEND` | Name of the frontend S3 bucket. |
| `CF_DISTRIBUTION_ID` | CloudFront distribution ID. |
| `VITE_API_URL` | Public API base URL, for example `https://api.example.com/api/v1`. |
| `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` | Supabase values embedded in the frontend build. |
| `DATABASE_URL` | Supabase PostgreSQL connection string used for Prisma migrations. |
| `EC2_HOST` and `EC2_SSH_KEY` | EC2 public address and private SSH key used by the deployment workflow. |
| `GHCR_READ_TOKEN` | GitHub token with permission to pull the published container images on EC2. |
| `BACKEND_URL` | Public backend URL used by the post-deployment health check, for example `https://api.example.com`. |

<a id="6-1-3-first-deployment-and-updates"></a>

#### 6.1.3 First deployment and updates

1. On EC2, sign in to GitHub Container Registry, then start the production stack.

```bash
cd /app/spendsense
docker login ghcr.io
GHCR_OWNER=<GitHub-owner> IMAGE_TAG=latest docker compose -f docker-compose.prod.yml pull
GHCR_OWNER=<GitHub-owner> IMAGE_TAG=latest docker compose -f docker-compose.prod.yml up -d
```

When prompted by `docker login`, use the GitHub username and `GHCR_READ_TOKEN`.

2. Confirm `https://api.example.com/api/v1/health` responds successfully.
3. Push approved code to `main`. The deployment workflow builds the static frontend, uploads it to S3, invalidates CloudFront, publishes container images, runs `prisma migrate deploy`, and restarts the EC2 containers.
4. Test a frontend login and a protected API flow. This confirms the frontend URL is allowed by CORS and Supabase tokens are accepted by the backend.


<a id="6-2-deployment-diagram"></a>

### 6.2 Deployment Diagram
<img src="./images/SpendSense Deployment.png"/>

<a id="6-2-1-systems-used"></a>

#### 6.2.1 Systems used
- AWS S3 and CloudFront host the React(Vite) frontend.
- AWS EC2 runs the backend and AI containers with Docker Compose.
- GitHub Actions builds the frontend, publishes backend and AI images to GitHub Container Registry, applies database migrations, and updates EC2 after a push to `main`.
- Supabase provides PostgreSQL and user authentication.
- Caddy runs on EC2 and provides HTTPS for the backend API.

<a id="6-2-2-deployment-nodes"></a>

#### 6.2.2 Deployment nodes

- **User Device:** Has a web browser installed that is used for accessing SpendSense.
- **Amazon S3:** Stores the static frontend artifacts generated by React & Vite build.
- **Amazon CloudFront:** Distributes the frontend artifacts and provides the frontend endpoint.
- **AWS EC2 Instance:** Is configured with Ubuntu OS, Docker, and Docker Compose.
- **Caddy Container:** Has the reverse proxy configuration that directs the API calls to the backend.
- **NestJS Backend Container:** Has the SpendSense backend running on Node.js 20 on port 3000.
- **FastAPI AI Container:** Has the AI service running on Python 3.11 on port 8000.
- **Supabase Auth:** Provides user authentication management.
- **Supabase PostgreSQL:** Stores the data of the application.

<a id="6-2-3-communication-paths"></a>

#### 6.2.3 Communication paths

- SpendSense frontend is accessed by users via CloudFront over HTTPS port 443.
- CloudFront accesses the frontend files from the private S3 bucket via CloudFront Origin Access Control.
- API calls are made via HTTPS over port 443 to Caddy.
- Caddy accesses API calls to the NestJS backend via HTTP over port 3000 in the EC2 Docker network.
- NestJS backend accesses the FastAPI AI service via HTTP over port 8000 in the Docker network.
- Frontend accesses Supabase Auth via HTTPS port 443.
- NestJS backend accesses Supabase PostgreSQL via TCP over port 5432.

<a id="6-3-ci-cd-pipeline-diagram"></a>

### 6.3 CI/CD Pipeline Diagram
<img src="./images/SpendSense CICD.png"/>

<a id="6-3-1-branching-flow"></a>

#### 6.3.1 Branching flow

The SpendSense repository uses the following branch flow:

`feature/*` → `dev` → `release` → `main`

Development is done on feature branches and pull requests into the `dev` branch are made. If the development test pass, a pull request is then made from the `dev` branch to the `release` branch. If the release passes human review and qualifies, a pull request is then made from `release` to the `main` branch.

<a id="6-3-2-development-ci"></a>

#### 6.3.2 Development CI

The CI pipeline for the development phase is triggered by the actions of a developer committing or creating a pull request in the `dev` branch.

Here are the checks:

- **Docs Check:** Checks the structure of the project documentation.
- **Backend PR Checks:** Linting, testing, and building the backend part.
- **Frontend PR Checks:** Linting, testing, and building the frontend part.
- **AI PR Checks:** Linting and testing of the AI service.
- **Secret Scan:** Scanning the code for credentials using Gitleaks.
- **Docker Check:** Executing `docker compose config` and `docker compose build`.

After the successful completion of all checks and a review from the team member, the pull request can be merged to `dev`.

<a id="6-3-3-release-qualification"></a>

#### 6.3.3 Release qualification

A pull request from `dev` to `release` triggers the release qualification phase.

The release validation consists of:

- Secret scanning
- Backend linting, testing, coverage and building
- Frontend linting, testing and building
- AI Service linting and testing
- Creation of the backend coverage artifact
- Validation of the readiness of the release

Additionally, the pipeline will prepare an end-to-end test environment, reset and seed the test data, run API end-to-end tests, Playwright user interface tests and clean up the test environment.

The pull request can be merged into the `release` branch only after successful release validation, end-to-end tests and manual validation.

<a id="6-3-4-production-deployment"></a>

#### 6.3.4 Production deployment

A pull request from `release` to `main` requires human review before it can be merged. A push to `main` triggers the GitHub Actions production deployment workflow.

The deployment workflow runs the following jobs:

- **deploy-frontend:** Builds the React and Vite frontend, synchronises the generated `frontend/dist` artefact to AWS S3, and invalidates the AWS CloudFront cache.
- **build-and-push-images:** Builds the backend and AI Docker images and publishes SHA-tagged images to GitHub Container Registry.
- **migrate-database:** Runs `npx prisma migrate deploy` against the Supabase PostgreSQL database.

These jobs must complete successfully before the EC2 deployment begins. The workflow then connects to the EC2 instance through SSH, retrieves the latest repository configuration, pulls the required container images, and restarts the production Docker Compose stack.

GitHub Actions is responsible for building the frontend, publishing the backend and AI images, applying database migrations, and updating the EC2 deployment after approved changes reach `main`.


<a id="6-3-5-deployment-artefacts-and-target-environments"></a>

#### 6.3.5 Deployment artefacts and target environments

The CI/CD pipeline will generate and deploy the following artefacts:

- Compiled React and Vite frontend is deployed to AWS S3 and delivered via CloudFront.
- Backend Docker image is pushed to GitHub Container Registry.
- AI Docker image is pushed to GitHub Container Registry.
- Backend test coverage report is saved as a workflow artefact.
- Prisma database migrations are executed in Supabase PostgreSQL.
- Backend service, AI service and Caddy reverse proxy run on the production EC2.

The `dev` branch is a development integration environment, the `release` branch is a release qualification environment, and the `main` branch is a production environment.

<a id="6-3-6-health-checks-and-failure-handling"></a>

#### 6.3.6 Health checks and failure handling

Once EC2 containers have been upgraded, the deployment workflow verifies the health of the backend endpoint:

`/api/v1/health`

The deployment to the production environment will be considered a success if the health check succeeds. The deployment plan also needs to test the front-end login and protected API endpoints post deployment.

In case of failure in either the front-end deployment, container image deployment, or database migration task, the EC2 deployment task will not run. There is currently no rollback in our CI pipeline, so any failed production deployment will need manual investigation and remediation.