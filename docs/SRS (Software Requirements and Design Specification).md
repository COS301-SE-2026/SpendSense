> NOTE, This document is still a work in progress and is currently (mainly) just a template for the final version.  


**Item**: Capstone Project 2026 - Demo 1 
**Team Name**: Mark2
**Team memebers**:

| Name     | Surname  | Student Number |
| -------- | -------- | -------------- |
| Allyson* | Andre    | u23525984      |
| Morgan   | Wattrus  | u23541068      |
| Kyle     | McCalgan | u24648826      |
| Kahlan   | Hagerman | u24601358      |
| Rachel   | Clifford | u24647374      |


# 1. Project Owner and Introduction

This Software Requirements Specification (SRS) defines the requirements for SpendSense, a gamified financial tracking web application developed by MARK2. The system helps students and young adults to track recurring financial obligations by making upcoming payments visible through a dashboard and calendar. The system supports obligation management, payment logging, credit score calculation, and gamification features based on credit score, and on-time payments such as coins, streaks, badges and mascot feedback. Its purpose is to help users understand the long term consequences of their financial behavior in a safe, educational environment without connecting to real banks, or payment providers.


# 2. Project Vision and Objectives

The vision of **SpendSense** is to provide students with an engaging and educational way to understand and manage their financial responsibilities before poor payment behaviour leads to real-world consequences. 

Many students have several financial obligations, such as *rent, subscriptions, utilities, buy-now-pay-later instalments, and informal IOUs*. Such payments tend to be spread across different platforms, including banking apps, emails, chats, subscription services, calendars, and personal memory. As a result, students may struggle to clearly see what they owe, when payments are due, and how their payment behaviour affects their overall financial health.
SpendSense aims to solve this problem by creating a centralised system where users can record and track their financial obligations in one place. 

SpendSense also aims to educate students on the consequences of their financial behaviour in a risk-free environment. Credit systems are often foreign to newly independent young adults and may only become meaningful after negative consequences have already occurred. Th Simulation of a financial health score that shows how actions such as on-time, late, missed, or overdue would affect credit scores without incurring negative-consequences .

The system is made Engaging through gamification features. By rewarding users with coins, badges, streaks, and mascot interactions, SpendSense turns responsible payment behaviour into an engaging feedback loop. 
Instead of only experiencing negative consequences when payments are missed, users receive immediate positive feedback when they manage their obligations well.

The main objectives of the system are to allow users to create and manage financial obligations, generate and display upcoming payment schedules, remind users of due payments, allow users to log payments, update a simulated financial health score, and reward positive financial behaviour. Together, these objectives aim to increase awareness of their financial commitments, encourage consistent on-time payments, and provide a low-risk environment for learning how everyday financial decisions can affect long-term financial health.

# 3. User Characteristics
_Your system will have different target users and different types of users. Your system might make use of role based access control and therefore, to know your type of users and their characteristics before hand is important. For example, you may need an Admin user who will carry out maintenance on the system as well as approve new users. In a nutshell you need to provide the characteristics of the users of your system._

# 4. Functional Requirements


>**A NOTE ON JARGON:** 
>* A **Financial Obligation** Refers to some expense that the logged-in user will have to satisfy buy some due date.
>* The term **Payment** will be used in regards to the user action of **Logging a *Payment***.
>
>The examples provided below the functionaly requirements will further emphasize this distincition. 


## FR1: Financial Obligation Management

* **FR1.1**: The System Shall allow **logged-in** users to create new financial obligations
* ***Example**: John logs into the app and adds 'Rent' as a new monthly obligation.*

* **FR1.2**: The System Shall require the **logged-in** user to provide the obligation type, amount, and date of recurrence when creating a new financial obligation 
* ***Example:** When John creates the rent obligation, he enters the type as “Rent”, the amount as R6500, and sets it to repeat on the 1st of every month.*

*  **FR1.3**: The System Shall display created obligations on a **calendar view**
* ***Example:** After John adds his rent obligation, the app shows “Rent  R6500” on the 1st day of each month in the calendar.*

*  **FR1.4**: The System Shall allow the user to expand a financial obligation on the **calendar view** to the see the **details** pertaining to that financial obligation. 
* ***Example:** John clicks on the rent item in the calendar, that item expands and John can see its amount, recurrence date, notes, and payment status.*

* **FR1.5:** The System Shall allow users to **modify** financial obligation details.
* ***Example:** John’s rent increases from R6500 to R7000, so he edits the obligation amount in the app.*

* **FR1.6:** The System shall allow users to **delete** financial obligations which removes them from their obligation list and the calendar view.
* ***Example:** John cancels his gym contract and deletes the “Gym Membership” obligation, and it no longer appears in his obligation list or calendar*

## FR2: Logging Payments

* **FR2.1:** The System Shall allow users to select a financial obligation from their calendar view and log a payment for that financial obligation. 
* ***Example:** John selects the “Rent” obligation on the calendar and chooses to log that he has paid it (he logs a payment).*

* **FR2.2:** The System Shall provide users with a payment logging form to fill in the payment details related to that financial obligation. 
* ***Example:** After selecting the rent obligation, John is shown a form where he enters the payment amount, payment date, and payment method.*

* **FR2.3:** The System Shall allow users to submit payment details pertaining to a selected financial obligation, updating that financial obligations status.
* ***Example:** John submits a R6500 card payment for rent, and the rent obligation changes from “unpaid” to “paid”.*

* **FR2.4:** The System Shall allow users to edit a logged payment made on an active financial obligation.
* ***Example:** John mistakenly records his rent financial obligation amount as R650 instead of R6500, so he edits the payment entry to correct the amount field.*

* **FR2.5:** The System Shall allow users to view payment history of past, inactive financial obligations. 
* ***Example:** John no longer pays for his old gym membership, but he can still view the payments he made for that obligation in previous months.*

## FR3: Gamification & rewards

* **FR3.1:** The System Shall calculate and display a users credit score based on their logged payment activity. 
* ***Example:** After John logs several on-time payments, the app displays a simulated credit score of X(_to be confirmed_)X.*

* **FR3.2:** The System Shall display an explanation of the users credit score.
* ***Example:** John opens his credit score page and sees that his score improved because he paid rent and insurance on time for three months.*

* **FR3.3:** The System Shall award badges to to the user when they complete award winning actions
* ***Example:** John receives a “First Payment Logged” badge after recording his first payment in the app*

* **FR3.4:** The System Shall allow the user to view the badges that they have earned
* ***Example:** John opens the rewards page and sees badges such as “First Payment Logged”, “Three-Month Streak”, and “Budget Beginner”.*

* **FR3.5:** The System Shall The system shall track and display the payments a user has made on-time 
* ***Example:** John opens his progress page and sees that he paid 8 out of his last 10 obligations on time.*

* **FR3.6:** The System Shall The system shall track and display the historical data of the payments a user has made on-time 
* ***Example:** John views a monthly history showing that he made 3 on-time payments in January, 4 in February, and 5 in March.*

* **FR3.7:** The System Shall award coins to a user for specific actions
* ***Example:** John earns 20 coins for logging a payment before its due date.*

* **FR3.8:** The System Shall calculate and display the users coin balance 
* ***Example:** John opens the rewards screen and sees that he currently has 240 coins.*

* **FR3.9:** The System Shall display a coin transaction log where coin-earning or coin-spending activity is available.
* ***Example:** John views his coin history and sees “+20 coins for paying rent on time” and “-50 coins for unlocking a mascot outfit”.*
	
* **FR3.10:** The System Shall display a mascot for the user
* ***Example:** John sees a small animated mascot on his dashboard.*

* **FR3.11:** The System Shall allow the user to view unlocked mascot outfits.
* ***Example:** John opens the mascot customisation page and sees that he has unlocked the “Superman”, “Bunny”, and “Batman” outfits.*

* **FR3.12:** The System Shall allow the user to view change the mascots outfit. 
* ***Example:** John selects the "Bunny” outfit for his mascot, and the mascot’s appearance changes on the dashboard.*


# 5. System Domain model
![alt text](assets/images/domain-model/domain-model.png)


# 6. Subsystems

## 6.1  Financial Obligation management
### 6.1.1 Use Cases
![alt text](assets/images/useCaseDiagrams/UC1_FinancialObligationManagement.png)

### US1.1: Add an Obligation
* **User Story**: As a User I want to add a new financial obligation So that I can track recurring or one-off payments in my dashboard
* **Acceptance criteria**: Given I am logged into the app When I fill in all required fields (type, amount, recurrence) and submit Then the obligation is created and displayed on my calendar/timeline

### US1.2: View Obligation on Calendar
* **User Story**: As a User I want to view obligations on the calendar So that I can see when payments are due
* **Acceptance criteria**: Given I have at least one obligation When I open the calendar view Then I can see all upcoming obligations with date, type, and amount

### US1.3: View Obligation Details
* **User Story**: As a User I want to view obligation details So that I can see more information about each payment, including history and notes
* **Acceptance criteria**: Given I am viewing the calendar or list of obligations When I select a specific obligation Then I see full details including payment history, notes, and recurrence settings

### US1.4: Edit Obligation
* **User Story**: As a User I want to edit an existing obligation So that I can correct mistakes or update payment details
* **Acceptance criteria**: Given an obligation exists When I open the edit form and update fields Then the obligation is updated and changes are reflected on the calendar/timeline

### US1.5: Delete Obligation
* **User Story**: As a User I want to delete an obligation So that I can remove payments that are no longer relevant
* **Acceptance criteria**: Given an obligation exists When I select delete and confirm Then the obligation is removed from my list and calendar view


### 6.1.2 Domain Model
![alt text](assets/images/domain-model/financial-obligation-subsystem.png)



## 6.2  Payment Logging
### 6.2.1 Use Cases
![alt text](assets/images/useCaseDiagrams/UC2_LoggingPayments.png)


### US2.1: Select a due Financial obligation for payment from the Dashboard or Calendar
* **User Story**: As a User I want to select a due financial obligation from my dashboard or timeline So that I can log a payment for an obligation
* **Acceptance criteria**: Given I have at least one upcoming payment When I navigate to the dashboard or timeline Then I can select a specific financial obligation to act on

### US2.2: Enter a Payment Method, Date & Amount
* **User Story**: As a User I want to enter the payment method, date, and amount So that the system can accurately record my payment
* **Acceptance criteria**: Given I have selected a due payment When I fill in the payment method, date, and amount fields Then the system validates the inputs before submission

### US2.3: Submit Payment
* **User Story**: As a User I want to submit the payment after entering details So that the system records the transaction and updates my obligations
* **Acceptance criteria**: Given I have entered valid payment details When I click the submit button Then the payment is recorded and the payment occurrence status updates

### US2.4: Edit Payment
* **User Story**: As a User I want to edit a payment I previously logged So that I can correct mistakes in the payment details
* **Acceptance criteria**: Given a payment has been submitted When I select the payment and update the details Then the changes are saved and reflected in the payment history

### US2.5: Delete Payment
* **User Story**: As a User I want to delete a payment I previously logged So that I can remove incorrect or duplicate entries
* **Acceptance criteria**: Given a payment exists in my history When I choose to delete and confirm Then the payment is removed and the payment occurrence is marked as unpaid

### US2.6: View Payment History
* **User Story**: As a User I want to view my payment history So that I can track all past payments for my obligations
* **Acceptance criteria**: Given I have logged payments When I open the payment history screen Then I can see a list of all past payments with date, amount, and method.


### 6.2.2 Domain Model
![alt text](assets/images/domain-model/logging-payments-subsystem.png)


## 6.3  Gameification
### 6.3.1 Use Cases
![alt text](assets/images/useCaseDiagrams/UC3_Gamification.png)


### US3.1: View Credit Score & Explanation
* **User Story**: As a User I want to view my credit score along with an explanation So that I understand my current financial standing and the factors affecting it
* **Acceptance criteria**: Given I have logged payments When I open the credit score screen Then I can see my score and a breakdown/explanation of contributing factors

### US3.2: View Badges
* **User Story**: As a User I want to view all badges I have earned So that I can track my achievements and progress
* **Acceptance criteria**: Given I have completed actions that award badges When I open the badges screen Then I see all badges earned with descriptions and unlock dates

### US3.3: View On-Time Payments Streak
* **User Story**: As a User I want to view my on-time payment streak So that I can monitor my consistency in making payments on time
* **Acceptance criteria**: Given I have logged payments When I view my streak screen Then I can see the current streak and historical streak data

### US3.4: View Coins Balance
* **User Story**: As a User I want to view my coins balance So that I know how many coins I have earned from actions and payments
* **Acceptance criteria**: Given I have completed actions that earn coins When I view my coin balance screen Then I see the total coins and a transaction log if available

### US3.5: Change Mascot’s Outfit
* **User Story**: As a User I want to change my mascot’s outfit So that I can personalise my gamification experience
* **Acceptance criteria**: Given I have unlocked outfits When I select a new outfit for my mascot Then the mascot’s appearance updates and is reflected across the app



### 6.3.2 Domain Model
![alt text](assets/images/domain-model/gameification-subsystem.png)


# 7. Quality Requirements
## QR1: Performance

* **QR1.1:** The System Shall return AI predictions within 2 seconds.
* **QR1.2:** The System Shall complete OCR processing within 5 seconds.
* **QR1.3:** The System Shall provide reliable real-time notifications.
* **QR1.4:** The System Shall provide real-time validation feedback for user input fields within 200 milliseconds.
* **QR1.5:** The System Shall maintain acceptable performance when supporting up to 1,000 concurrent users, subject to hosting limitations.
* **QR1.6:** The System Shall use scalable backend technologies to support changes in user demand.
* **QR1.7:** The System Shall store financial records in a structured format to support efficient data retrieval and processing.

## QR2: Usability

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


## QR3: Security

* **QR3.1:** The System Shall provide secure login for users accessing the application.
* **QR3.2:** The System Shall securely store user information and financial data.
* **QR3.3:** The System Shall encrypt sensitive user data where necessary.
* **QR3.4:** The System Shall protect user data against common web vulnerabilities.
* **QR3.5:** The System Shall ensure that user information is not shared with third parties.
* **QR3.6:** The System Shall provide secure HTTPS access when deployed in the production environment.
* **QR3.7:** The System Shall be deployed using secure HTTPS access.
* **QR3.8:** The System Shall keep logs of data-related system activities.
* **QR3.9:** The System Shall log important system and data management activities.


## QR4: Risk Assessment
* **QR4.1:** The System Shall comply with data privacy best practices when processing sensitive financial data.
* **QR4.2:** The System Shall be tested to confirm that important quality requirements have been satisfied.
* **QR4.3:** The System Shall include unit tests.
* **QR4.4:** The System Shall include integration tests.
* **QR4.5:** The System Shall include user acceptance testing.
* **QR4.6:** The System Shall include a summarized testing report at project completion.
* **QR4.7:** The System Shall be tested to confirm that core functional requirements have been implemented correctly.
* **QR4.8:** The System Shall provide logs of important system activities to support auditing and risk review.
* **QR4.9:** The System Shall provide logs of data-related activities to support auditing and risk review.


## QR5: Reliability

* **QR5.1:** The System Shall maintain 99.9% uptime.
* **QR5.2:** The System Shall provide continuous access to user financial data.
* **QR5.3:** The System Shall use automated backups to reduce the risk of data loss.
* **QR5.4:** The System Shall use redundant storage for uploaded receipts.
* **QR5.5:** The System Shall provide redundancy for stored receipt data.
* **QR5.6:** The System Shall use a relational database to store user records, financial obligations, payments, and gamification data.
* **QR5.7:** The System Shall use cloud storage for receipt storage.   


## QR6: Maintainability

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


## QR7: Portability
* **QR7.1:** The System Shall be deployed to a publicly accessible cloud production environment.
* **QR7.2:** The System Shall be accessible through a custom domain.
* **QR7.3:** The System Shall include deployment scripts.   
* **QR7.4:** The System Shall include environment configuration details.
* **QR7.5:** The System Shall include setup instructions to support future maintenance and extension.
* **QR7.6:** The System Shall be deployable using the provided setup instructions.
* **QR7.7:** The System Shall be configurable for deployment in a cloud production environment.

# 8. Architecture Diagram
<img width="6004" height="2568" alt="image" src="https://github.com/user-attachments/assets/004a7881-1d4f-4cf2-bc41-663fbf0218e5" />

# 9.Traceability matrix
| Functional Requirement | UC1: Financial Obligation Management | UC2: Logging Payments | UC3: Gamification & Rewards |
|-----------------------------|:----------------------------------:|:-------------------:|:--------------------------:|
| FR1.1 | X |  |  |
| FR1.2 | X |  |  |
| FR1.3 | X |  |  |
| FR1.4 | X |  |  |
| FR1.5 | X |  |  |
| FR1.6 | X |  |  |
| FR2.1 |  | X |  |
| FR2.2 |  | X |  |
| FR2.3 |  | X |  |
| FR2.4 |  | X |  |
| FR2.5 |  | X |  |
| FR3.1 |  |  | X |
| FR3.2 |  |  | X |
| FR3.3 |  |  | X |
| FR3.4 |  |  | X |
| FR3.5 |  |  | X |
| FR3.6 |  |  | X |
| FR3.7 |  |  | X |
| FR3.8 |  |  | X |
| FR3.9 |  |  | X |
| FR3.10 |  |  | X |
| FR3.11 |  |  | X |
| FR3.12 |  |  | X |



