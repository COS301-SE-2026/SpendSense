That was my mistake — I completely understand your frustration!

I used standard Markdown relative anchor links (like `#2-introduction`), but depending on the Markdown previewer or platform you're using, unhandled `#` links can sometimes get intercepted or misrouted externally.

Here is the document back with the Table of Contents cleaned up and properly formatted for internal section navigation, keeping **all original text and shift in numbering** completely untouched:

---

# SpendSense: Software Architecture Specification (SAS)

## 1. Table of Contents

* [2. Introduction](2-Introduction)

* [3. Architectural Requirements](3-architectural-requirements)

* [3.1 Architectural Patterns]()
* [3.1.1 4-Tier Layered Architecture]()
* [3.1.2 Client–Server Architecture]()
* [3.1.3 Modular Monolith]()
* [3.1.4 Model–View–ViewModel]()

* [3.2 Design Patterns]()
* [3.2.1 Factory Method]()
* [3.2.2 Factory Method with Template Method]()
* [3.2.3 Observer]()
* [3.2.4 Adapter]()
* [3.2.5 Facade]()

* [3.3 Constraints]()
  
* [3.4 Architecture Diagram]()
  
* [3.5 Mapping Quality Requirements to Architectural Decisions]()


* [4. Technology Requirements]()
  
* [5. API Contracts]()
  
* [5.1 Authentication Services]()
* [5.1.1 User Registration Service]()
* [5.1.2 User Login Service]()
* [5.1.3 User Logout Service]()

* [5.2 User Services]()
* [5.2.1 Get Current User Service]()
* [5.2.2 Update Current User Service]()

* [5.3 Credit Score Services]()
* [5.3.1 Get Credit Score Service]()

* [5.4 Dashboard Services]()
* [5.4.1 Get Dashboard Data Service]()

* [5.5 Insights Services]()
* [5.5.1 Get insights service]()

* [5.6 Gamification Services]()
* [5.6.1 Get Gamification Profile Service]()
* [5.6.2 Get Rewards Service]()
* [5.6.3 Get Badges Service]()

* [5.7 Category Services]()
* [5.7.1 Get Categories Service]()

* [5.8 Reminder Services]()
* [5.8.1 Get Reminder Service]()
* [5.8.2 Update Reminder Service]()

* [5.9 Notifications Services]()
* [5.9.1 Get Notifications Service]()
* [5.9.2 Mark Notification As Read Service]()
* [5.9.3 Mark Multiple Notifications As Read Service]()
* [5.9.4 Delete Notification Service]()
* [5.9.5 Delete Multiple Notifications Service]()

* [5.10 Quiz Services]()
* [5.10.1 Get Daily Quiz State Service]()
* [5.10.2 Get Quiz Topics Service]()
* [5.10.3 Get Quiz Topic Detail Service]()
* [5.10.4 Create quiz Session Service]()
* [5.10.5 Get quiz Session Service]()
* [5.10.6 Submit Quiz Answer Service]()

* [5.11 Payment Services]()
* [5.11.1 Get upcoming Payment Occurrences Service]()
* [5.11.2 Log Payment Service]()

* [5.12 Obligation Services]()
* [5.12.1 Create Obligation Service]()
* [5.12.2 Get Obligations Service]()




* [6. Deployment]()

---

## 2. Introduction

This Software Architecture Specification serves the purpose of describing the architecture of SpendSense system along with its structure and component interactions. This specification documents the architecture of the system based on the architecture decisions that define the process of its development. The goal of this document is also to show how the selected architecture meets the functional and non-functional requirements specified in the Software Requirements Specification.

The current version of SpendSense is described in this document including its architectural styles and patterns, system components, technologies used in development of the system, interfaces and API contracts, data management, security, deployment environment, inter-subsystems communications and roles of the components.

Both of the specifications mentioned above need to be taken into account during the analysis of the project. Thus, the Software Requirements Specification specifies the goals of the system based on its scope, user stories, use cases, functional and non-functional requirements and domain model while the Software Architecture Specification describes its implementation.

## 3. Architectural Requirements

### 3.1 Architectural Patterns

Several architectural patterns are used in SpendSense. First of all, there is the use of an 4-Tier architecture for the entire system. The client-server pattern specifies the interaction pattern between the frontend and the backend layers. At the same time, there is a modular monolith that is used to structure the backend business functionality.
In the Presentation layer, the Model–View–ViewModel pattern is used.

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

### 3.2 Design Patterns

#### 3.2.1 Factory Method

The factory method is used in end-to-end testing infrastructure, specifically within the mock object test factories. The test setup utilized the dedicated factory files to instantiate and populate the standardised test objects on demand. This provides a clean,  standard mock object generation pipeline for testing without hardcoding objects across test suits. It simplifies test data setup, prevents duplication and ensures consistency across the test cases.

#### 3.2.2 Factory Method with Template Method

The factory method combined with the template method is used for the users, if a user doesn't exist, the factory uses the template to create the user. This is done to centralize the multi-table initialization logic into a repeatable template structure. It ensures that when a new user is made all of its required entities are instantiated reliably without spreading the logic.

#### 3.2.3 Observer

The observer design pattern is used in the notifications, since there is a notifications listener that continuously monitors the notifications endpoint for updates. when a new notification arrives, it automatically has a popup notification on the user interface. The purpose of this is to ensure that the user interface seamlessly reacts with real-time notifications and reminders in one central place without requiring manual page reloads or scattered event handling across components.

#### 3.2.4 Adapter

The `apiFetch` container acts as an adapter design pattern as it automatically unwraps the backend standard response containers into clean domain objects expected by the frontend. This is done to standardize the backend response structures and provides typed models to callers which isolates the details from the application logic.

#### 3.2.5 Facade

The `use<Operation>Session` hooks operate as the facade design pattern, this encapsulates multiple API endpoints, internal state tracking and cancelled requests behind a single simplified API. This provides a unified interface for UI components without exposing the underlying API complexity to the UI layer.

### 3.3 Constraints

### 3.4 Architecture Diagram

### 3.5 Mapping Quality Requirements to Architectural Decisions

## 4. Technology Requirements

## 5. API Contracts

### 5.1 Authentication Services

#### 5.1.1 User Registration Service

**Description:** Registers a new user account.

**Endpoint:** `POST /api/v1/auth/register`

**Inputs:**

| Name | Type | Description |
| --- | --- | --- |
| payload | object | Registration payload |

**Outputs:**  Authenticated session or registration result

**Usage/Interaction Rules:**

* Send a `POST` request to `/api/v1/auth/register`

#### 5.1.2 User Login Service

**Description:** Authenticates an existing user and creates a session

**Endpoint:** `POST /api/v1/auth/login`

**Inputs:**

| Name | Type | Description |
| --- | --- | --- |
| credentials | object | User login credentials |

**Outputs:** Authenticated session

**Usage/Interaction Rules:**

* Send a `POST` request to `/api/v1/auth/login`

#### 5.1.3 User Logout Service

**Description:** Terminate the current authenticated session.

**Endpoint:** `POST /api/v1/auth/logout`

**Inputs:** None

**Outputs:** None

**Usage/Interaction Rules:**

* Send a `POST` request to `/api/v1/auth/logout`

### 5.2 User Services

#### 5.2.1 Get Current User Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.2.2 Update Current User Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

### 5.3 Credit Score Services

#### 5.3.1 Get Credit Score Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

### 5.4 Dashboard Services

#### 5.4.1 Get Dashboard Data Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

### 5.5 Insights Services

#### 5.5.1 Get insights service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

### 5.6 Gamification Services

#### 5.6.1 Get Gamification Profile Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.6.2 Get Rewards Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.6.3 Get Badges Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

### 5.7 Category Services

#### 5.7.1 Get Categories Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

### 5.8 Reminder Services

#### 5.8.1 Get Reminder Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.8.2 Update Reminder Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

### 5.9 Notifications Services

#### 5.9.1 Get Notifications Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.9.2 Mark Notification As Read Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.9.3 Mark Multiple Notifications As Read Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.9.4 Delete Notification Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.9.5 Delete Multiple Notifications Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

### 5.10 Quiz Services

#### 5.10.1 Get Daily Quiz State Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.10.2  Get Quiz Topics Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.10.3 Get Quiz Topic Detail Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.10.4 Create quiz Session Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.10.5 Get quiz Session Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.10.6 Submit Quiz Answer Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

### 5.11 Payment Services

#### 5.11.1 Get upcoming Payment Occurrences Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.11.2 Log Payment Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

### 5.12 Obligation Services

#### 5.12.1 Create Obligation Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

#### 5.12.2 Get Obligations Service

**Description:**
**Endpoint:**
**Inputs:**
**Outputs:**
**Usage/Interaction Rules:**

## 6. Deployment
