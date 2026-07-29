# SpendSense: Software Architecture Specification (SAS)

## 1. Introduction
This Software Architecture Specification serves the purpose of describing the architecture of SpendSense system along with its structure and component interactions. This specification documents the architecture of the system based on the architecture decisions that define the process of its development. The goal of this document is also to show how the selected architecture meets the functional and non-functional requirements specified in the Software Requirements Specification.

The current version of SpendSense is described in this document including its architectural styles and patterns, system components, technologies used in development of the system, interfaces and API contracts, data management, security, deployment environment, inter-subsystems communications and roles of the components.

Both of the specifications mentioned above need to be taken into account during the analysis of the project. Thus, the Software Requirements Specification specifies the goals of the system based on its scope, user stories, use cases, functional and non-functional requirements and domain model while the Software Architecture Specification describes its implementation.

## 2. Architectural Requirements

### 2.1 Architectural Patterns
Several architectural patterns are used in SpendSense. First of all, there is the use of an 4-Tier architecture for the entire system. The client-server pattern specifies the interaction pattern between the frontend and the backend layers. At the same time, there is a modular monolith that is used to structure the backend business functionality. 
In the Presentation layer, the Model–View–ViewModel pattern is used.

#### 4-Tier Layered Architecture
**Purpose:** The intention behind the layered architecture is to split up the system into layers of distinct responsibility. The SpendSense system is based on the N-tier architecture with four layers: the Presentation Layer, Access Layer, Service Layer, and Data Layer. In addition, every layer takes care of performing a certain kind of task in cooperation with its neighboring layers.
**Why the pattern was selected:** SpendSense has its user interface functionality, request handling, financial business logic, and persistence tasks implemented in the system. The combination of all these aspects in a single component will complicate the system in terms of understanding, testing, and modification. Hence, the N-tier architectural pattern was chosen as it provides separation of concerns and minimizes the impact of changes in the system.
The N-tier pattern is also a good choice as SpendSense is an interactive system where the user initiates some action through the interface and gets a suitable response from the system for the performed request. Interactive systems are related to an N-tier architecture and client-server interaction model according to the lecture materials.
**Structure and application in SpendSense:** The four layers are used as follows:
- Presentation Layer presents information, receives user input, and processes frontend presentation states.
- Access Layer contains controllers that process frontend requests, check the correctness of input data, do access checks, and forward request to the Service Layer.
- Service Layer contains business logic components, including financial obligations, payment history processing, scoring, statistics and insights, quizzes, notifications and reminders, gamification and rewards, and user profiles management.
- Data Layer takes care of information persistence and retrieval for users, obligations, payments, quizzes, rewards, notifications, and user profiles.

A regular flow starts at Presentation Layer and proceeds to Access Layer controller. Access Layer controller forwards the operation to the appropriate Service Layer component. The service processes the business logic and uses Data Layer when information needs to be stored or retrieved.
**Quality attributes supported:** The following qualities are facilitated using the four-layer architecture approach:
- *Maintainability:* roles are segregated, thus making any changes possible locally at the particular layer level.
- *Modifiability:* any changes in the layer’s implementation details may be possible without affecting the other layers as long as their interfaces are left unchanged.
- *Testability:* controllers, services, and frontend features can be tested independently, while dependencies may be substituted with mocks.
- *Security:* authentication, authorization, validation, and business rules can be applied before persistent data access.
- *Scalability:* frontend, backend, and data hosting parts can be independently deployed and scaled in environments that support this.
- *Reusability:* functionality of the Service Layer may be used by different controllers and frontend processes.

**Trade-offs and limitations:** Adding layers adds to the number of components that the request needs to go through. This could lead to code and even more indirection and complexity of ideas. Simple actions might need the addition of a frontend component, API, a controller, a service action, data-access and finally the response model.
However, the pattern will work effectively when there is consistency in the application of its boundaries. For instance, when there are business rules in the frontend component, there is no use of services while accessing the database in controllers and one service accessing the other module’s inner workings.
This kind of abstraction increases maintainability and testability of the code, but also leads to overhead and makes the code harder to understand by new programmers. The separation and abstraction localise change but can add more layers and overhead

#### Client–Server Architecture
**Purpose:** The purpose of the client-server architecture is to separate the application, which deals with the client end, from the central server that will process all the business logic and security and manage all the accesses to data.
**Why the pattern was selected:** SpendSense is a web application in which the user interacts via the frontend and, at the same time, needs to have its financial rules and data controlled centrally. With the use of the client-server architecture, the frontend part can focus on the user interactions and rendering while the backend will take control of the authentication, validation, financial computations, payments, quiz settlement, notifications, and access to the storage data.
It is very important to centralize these operations to prevent rules implementation only in the client part.
**Structure and application in SpendSense:** React and TypeScript are used for the frontend of the system. This part shows the application screens to the user, processes user inputs, keeps track of presentation state, and performs HTTP requests to the backend API.
NestJS is used for the backend of the system. This part acts as the server that listens to the client requests and calls the corresponding services.
For example, when a user logs a payment, the frontend passes information about the payment to the backend. The backend then checks the request, adds a new payment, changes the payment frequency, computes new financial and gamification information, and returns the information back to the frontend.
**Quality attributes supported:**Quality Attributes supported by the client-server architecture include:
- *Security:* Financial and data access policies are contained on the server side, not the client.
- *Maintainability:* Frontend and backend components can be changed independently, provided the API agreement stays the same.
- *Scalability:* Client delivery and server processing can be scaled independently.
- *Consistency:* The client accesses consistent central business rules and data.
- *Usability:* The client can deliver responsive UI and the server deals with complex processing.
- *Integrability:* Outside systems deal with controlled backend interfaces, not with the frontend or database directly.

**Trade-offs and limitations:** Availability of the backend server and its connectivity to the frontend is required for proper functioning of the frontend. If the backend service is down, then most of the functions of SpendSense cannot be performed although the frontend application itself is available.
Latency and potential failures can occur through network communication. In order to ensure that the client and the server can continue communicating properly, the API contract needs to be managed appropriately.
The server could turn out to be a bottleneck in performance or single point of failure due to inadequate monitoring, replication, and scaling. There are some considerations that need to be kept in mind during separation of the client and server side applications.
#### Modular Monolith
**Purpose:** The purpose for a modular monolith is to split the backend into business capability-based modules but still have one backend application and one backend deployment. Each module is responsible for its area and has controlled interfaces to the rest of the application.
**Why the pattern was selected:** SpendSense has several functional blocks, including obligations, payments, credit scoring, notifications, quizzes, gamification, insights, and profiles. These blocks should have clearly defined boundaries to allow developers to work and test them separately from other backend functionality.
But at this point, the scope of the project and the size of the development team do not require the overhead of deploying microservices independently of each other. A modular monolith will provide separation of concerns but does not require multiple backend deployments, distributed transactions, service discovery, message brokers, and inter-service networking.
**Structure and application in SpendSense:** The SpendSense backend is created with the help of one NestJS application that includes modules for major business functionalities of the system. The major ones include:
- User Profile
- Financial Obligation
- Payment Logging and Management
- Credit Score
- Gamification and Rewards
- Notifications and Reminders
- Quiz
- Insights and Analytics

Each module holds all the controllers, services, data transfer objects, validators, and other logic needed for this functionality. Modules can interact via their service interfaces in case when one business process affects another.
For example, logging a payment requires Payment module, Credit Score module, Gamification module, and Notifications module. While the interaction takes place between those modules, they belong to one backend application and can participate in database operations together without any networking between different services.
**Quality attributes supported:** The quality attributes of the modular monolith include the following:
- *Maintainability:* related business capabilities are encapsulated in specific modules.
- *Modifiability:* modifications are limited to the affected module.
- *Testability:* each module can be tested separately.
- *Reliability:* multi-module operations can be managed through one application/database transaction.
- *Performance:* communication between the modules happens via local in-process method calls.
- *Deployability:* deployment of a single backend application replaces deployment of many distributed services.
- *Understandability:* module structure is based on business capabilities and use cases of SpendSense.

**Trade-offs and limitations:** All modules being one deployment for the backend, they cannot be independently deployed and scaled. Failure of the backend process can impact all modules instead of impacting just one business capability.
This architectural approach also assumes that internal boundaries are respected. If there are no well-defined module interfaces, developers will most likely end up building a tight coupling of a monolith.
With growing application size, build, test, and deployment processes will take more time. Shared database will let developers have access to the data of one module from the other, if they violate ownership principles.
Despite these downsides, this architecture consciously takes all those risks to gain an easier development, testing, deployment, transactions, and monitoring processes. If the current modules were split into microservices, then the developer would deal with a network failure, distributed-data consistency, authentication, deployment, and other problems, which are unnecessary now.

#### Model–View–ViewModel
**Purpose:** The purpose of the Model-View-ViewModel design is to seperate the UI and its state from the logic of interaction and the models of data representation. Otherwise, the View will have to do both UI and all the other operations.
**Why the pattern was selected:** In SpendSense, there are interactive views with states of loading, user interaction, validation, filtering, navigation, API calls, and changing finance data. It would complicate the frontend greatly if that code were to be added to UI elements directly.
MVVM pattern was chosen to make the roles of the frontend clear:
- The View deals with rendering UI and handling user interaction
- The ViewModel handles the frontend behavior and interaction with the Model

**Structure and application in SpendSense:** The following are the MVVM responsibilities in practice:
- The View is made up of React pages and reusable view components. This part shows the data and passes user actions to the ViewModel.
- The ViewModel includes presentation logic, hooks, form management, validation, event handling, and coordination with the API. It prepares the data to be shown by the View.
- The Model contains frontend data types, domain models, API requests, and API responses sent by the backend.

The View doesn't communicate directly with the backend controllers. User actions are processed by the ViewModel, which performs the necessary frontend API calls and updates the presentation state based on the server's reply.
For example, on the Notifications page, the View shows the notifications list, the filters, the loading state, and the unread notifications status. The ViewModel is responsible for loading notifications, applying the type filter, reading notifications, handling errors, and updating the displayed data. The Model contains notification types, API responses, pagination info, and read status values.
**Quality attributes supported:** The MVVM approach enables the following quality attributes:
- *Maintainability:* presentation layer and visual layout can be changed independently.
- *Testability:* logic of ViewModels can be tested independently from rendered UI elements.
- *Modifiability:* coordination between APIs or state management logic can be modified without changing View.
- *Reusability:* ViewModels, hooks, models, and visual parts can be used repeatedly in different pages.
- *Usability:* predictable handling of presentation states makes possible proper loading, success, empty, and failure states.
- *Understandability:* developers find it easier to determine which part is responsible for visual aspects, behaviour, and data.
**Trade-offs and limitations:** With MVVM there is an extra level of abstraction between the View and the backend system. What was once a simple page will need separate pieces for hooks, components, models and API calls, making more files and abstractions.
It is also possible to have confusion between the View and the ViewModel when using React due to hooks and component code being written in the same file. For that reason, the MVVM architecture has to be strictly adhered to, not by using separate files, but through naming conventions and responsibilities.
Incorrectly developed ViewModels can grow too big and start including business rules which should stay in the backend Service Layer. The ViewModel on the client side is responsible for presentation logic only, while business rules and financial calculations should take place in the backend.
### 2.2 Design Patterns

### 2.3 Constraints

### 2.4 Architecture Diagram
<img width="1200" alt="2.4 Architecture Diagram" src="./images/ArchitectureDiagram.jpeg" />

### 2.5 Mapping Quality Requirements to Architectural Decisions

## 3. Technology Requirements

## 4. API Contracts

## 5. Deployment