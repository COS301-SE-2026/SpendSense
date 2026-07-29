# SpendSense Coding Standards
# Table of contents



- [Purpose](#-purpose)
- [The Repository Structure](#--the-repository-structure)
  - [Overview](#overview)
    - [Environmental Containerisation](#environmental-contianerisation-)
    - [Consistent Styling with ESLint](#eslint-)
    - [High-Level Directory Tree](#directory-tree)
  - [A Deeper Dive](#deeper-dive)
    - [Backend](#backend)
    - [Frontend](#frontend)


# 1. Purpose 📋
> This document details our reasoning for the structure of our Repo, How we have configured various services to improve the consistency of our code, and how we keep our development uniform and maintainable.  


# 2. The Repository Structure 📁 
This section details the Structure of our Repository. The structure facilitates the containerisation of our applications` servies and our testing, linting and build verifications.  


## 🔍 Overview 
Below is a high Highlevel overview of the Repository Structure. You will note all our services have their own containerized development environment  <br>

### Environmental contianerisation 🐳
Using Docker provides environmental consistency across all development machines. The configuration ensures that every team member executes the backend using the same:

* Node.js runtime version
* Package dependencies
* Environment configuration
* Build process

Instead of requiring developers to manually install and configure dependencies locally, the project uses the dependency definitions stored in `package.json`. Docker installs and manages these dependencies automatically, reducing environment-related issues and ensuring reproducible development environments

### Consistent Styling with eslint 🧹



### Highlevel directory tree visual 🌳


```bash
.
├── backend                         # Backend Servce
│   ├── coverage                    # testing coverage for backend
│   ├── Dockerfile.dev              # docker configuration for dev
│   ├── Dockerfile.prod             # docker configuration for deployed production
│   ├── eslint.config.mjs           # backend linting 
│   ├── nest-cli.json
│   ├── package.json                # backend dependencies 
│   ├── package-lock.json
│   ├── prisma
│   ├── README.md
│   ├── scripts
│   ├── src
│   ├── test
│   ├── tsconfig.build.json
│   └── tsconfig.json
|
├── Caddyfile
├── docker-compose.e2e.yml          # e2e testing service
├── docker-compose.prod.yml
├── docker-compose.yml
|
├── frontend                        # Frontend Service
│   ├── components.json
│   ├── Dockerfile.dev
│   ├── Dockerfile.e2e
│   ├── e2e
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── playwright
│   ├── playwright.config.ts
│   ├── playwright-report
│   ├── public
│   ├── README.md
│   ├── src
│   ├── test-results
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   └── vitest.config.ts
|
├── package.json
├── package-lock.json
|
├── scripts
│   ├── print-local-links.cjs
│   ├── print-supabase-swagger-token.cjs
│   └── run-e2e-ui.cjs
|
└── test-support 
    ├── auth
    ├── database
    ├── factories
    ├── README.md
    └── scenarios
```


<br>

## 🔬 A deeper dive



###  🔌 Backend 
> The SpendSense backend follows a feature-based, use-case-driven architecture using NestJS. The application is structured around individual business domains, where each feature module contains the required controllers, services, data access logic, and supporting utilities required to implement a specific use case accoriding to the applications bussiness capabilities.


```bash
backend/
│
├── src/                
│   ├── main.ts             
│   ├── auth/           # auth logic for user verification
│   ├── payments/       # payment logging related logic 
│   ├── users/          # user creation / returning logic
│   ├── prisma/         # database service integration
│   └── ...             
│
├── prisma/
│   ├── schema.prisma       # database schema definition
│   ├── migrations/         # version-controlled database changes
│   └── seed/               # initial development data
│
├── test/                   # e2e testing suite support
│
├── Dockerfile.dev          # development container configuration
├── Dockerfile.prod         # droduction container configuration
│
└── package.json            # backend dependencies and scripts

```
<br>

All Modules follow a very similar structure. Unit tests are developed alongside backend services to ensure that each use case behaves according to the expected requirements. This approach ensures that new functionality can be developed independently while maintaining a predictable foundation of existing logic. 

```bash
bussiness-logic-feature/
├── .controller.ts      # handles requests and responses
├── .service.ts         # business logic and use-case implementation
├── .module.ts          # business logic and use-case implementation
├── dto/                # validated input structures
└── *.spec.ts           # unit tests for the module

```

<br>

###  🎨 Frontend 

## 

## 