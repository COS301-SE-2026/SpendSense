> Note:  This document is still a work in progress. (19-May)
> 
> To My Understanding, "Quality Requirements" refer to the "Non-Functional Requirements"
> In COS301 Lecture-13 (13-April) Non-Functional Requirements are (*Performance, Usability, Security, Risk Assessment, Reliability, Maintainability, Portability*)
> .
> All Requirements listed below come from the SpendSense Specification under the headings (Architecture Requirements, Design Requirements, Delivery Requirements and Contraints). 
> .
> I have grouped the requirements that were listed underneath those SpendSense Specification headings according to the COS301 Lecture-13. 


 
# QR1: Performance

* **QR1.1:** The System Shall return AI predictions within 2 seconds.
* **QR1.2:** The System Shall complete OCR processing within 5 seconds.
* **QR1.3:** The System Shall provide reliable real-time notifications.
* **QR1.4:** The System Shall provide real-time validation feedback for user input fields within 200 milliseconds.
* **QR1.5:** The System Shall maintain acceptable performance when supporting up to 1,000 concurrent users, subject to hosting limitations.
* **QR1.6:** The System Shall use scalable backend technologies to support changes in user demand.
* **QR1.7:** The System Shall store financial records in a structured format to support efficient data retrieval and processing.

# QR2: Usability

* **QR2.1:** The System Shall be delivered as a responsive web application.
* **QR2.2:** The System Shall support the latest two versions of Chrome, Safari, and Edge.
* **QR2.3:** The System Shall clearly describe validation errors to the user when invalid data is entered.
* **QR2.4:** The System Shall comply with standard accessibility guidelines such as WCAG 2.1.
* **QR2.5:** The System Shall support screen readers where applicable.
* **QR2.6:** The System Shall provide suitable colour contrast for readability.
* **QR2.7:** The System Shall support keyboard navigation.
* **QR2.8:** The System Shall ensure that important interface elements are accessible to users with different accessibility needs.
* **QR2.9:** The System Shall include a user manual.
* **QR2.10:** The System Shall include a demonstration video or live demo.
* **QR2.11:** The System Shall demonstrate all core and optional features during final delivery.


# QR3: Security

* **QR3.1:** The System Shall provide secure login for users accessing the application.
* **QR3.2:** The System Shall securely store user information and financial data.
* **QR3.3:** The System Shall encrypt sensitive user data where necessary.
* **QR3.4:** The System Shall protect user data against common web vulnerabilities.
* **QR3.5:** The System Shall ensure that user information is not shared with third parties.
* **QR3.6:** The System Shall provide secure HTTPS access when deployed in the production environment.
* **QR3.7:** The System Shall be deployed using secure HTTPS access.
* **QR3.8:** The System Shall keep logs of data-related system activities.
* **QR3.9:** The System Shall log important system and data management activities.


# QR4: Risk Assessment
* **QR4.1:** The System Shall comply with data privacy best practices when processing sensitive financial data.
* **QR4.2:** The System Shall be tested to confirm that important quality requirements have been satisfied.
* **QR4.3:** The System Shall include unit tests.
* **QR4.4:** The System Shall include integration tests.
* **QR4.5:** The System Shall include user acceptance testing.
* **QR4.6:** The System Shall include a summarized testing report at project completion.
* **QR4.7:** The System Shall be tested to confirm that core functional requirements have been implemented correctly.
* **QR4.8:** The System Shall provide logs of important system activities to support auditing and risk review.
* **QR4.9:** The System Shall provide logs of data-related activities to support auditing and risk review.


# QR5: Reliability

* **QR5.1:** The System Shall maintain 99.9% uptime.
* **QR5.2:** The System Shall provide continuous access to user financial data.
* **QR5.3:** The System Shall use automated backups to reduce the risk of data loss.
* **QR5.4:** The System Shall use redundant storage for uploaded receipts.
* **QR5.5:** The System Shall provide redundancy for stored receipt data.
* **QR5.6:** The System Shall use a relational database to store user records, financial obligations, payments, and gamification data.
* **QR5.7:** The System Shall use cloud storage for receipt storage.   


# QR6: Maintainability

* **QR6.1:** The System Shall allow future feature additions without major redesign.
* **QR6.2:** The System Shall support the addition of new analytics features without major redesign.    
* **QR6.3:** The System Shall support the addition of new payment types without major redesign.    
* **QR6.4:** The System Shall support the addition of new gamification features without major redesign.
* **QR6.5:** The System Shall use maintainable backend technologies.
* **QR6.6:** The System Shall use modern frameworks for frontend and backend development.
* **QR6.7:** The System Shall use maintainable technologies for backend development.
* **QR6.8:** The System Shall store all source code in a version-controlled repository and follow a defined branching strategy.
* **QR6.9:** The System Shall include source code documentation.
* **QR6.10:** The System Shall include technical documentation.
* **QR6.11:** The System Shall include system architecture diagrams.
* **QR6.12:** The System Shall include a database schema.
* **QR6.13:** The System Shall include API documentation.
* **QR6.14:** The System Shall include handover documentation to allow future teams to maintain or extend the system.


# QR7: Portability
* **QR7.1:** The System Shall be deployed to a publicly accessible cloud production environment.
* **QR7.2:** The System Shall be accessible through a custom domain.
* **QR7.3:** The System Shall include deployment scripts.   
* **QR7.4:** The System Shall include environment configuration details.
* **QR7.5:** The System Shall include setup instructions to support future maintenance and extension.
* **QR7.6:** The System Shall be deployable using the provided setup instructions.
* **QR7.7:** The System Shall be configurable for deployment in a cloud production environment.