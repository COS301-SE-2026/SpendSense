# SpendSense: Software Requirements Specification (SRS)

## 1. Introduction
SpendSense is a gamified financial management and financial literacy system intended to assist individuals to manage their financial commitments, learn about their payment behavior, and create better financial habits.

Most users, especially students and young people, find it challenging to keep up with their financial obligations, payment deadlines, and the impact their non-payment or delays will have on their financial health. Information about finances is scattered over various platforms, and therefore users do not always have a clear idea of what financial obligations they have, when the deadlines are coming, and what aspects of their financial behavior they should be worried about. As a consequence, users may miss the payments, plan poorly their finances, experience unnecessary financial stress, and lack financial knowledge.

The business need for SpendSense is driven by the need for an accessible and fun financial management system that will do more than just keep a record of the transactions. Users require a centralized system that will remind them about their future financial obligations, explain the impact of their payments, and motivate them to behave in a responsible manner regarding finance. Users also need comprehensible financial insights and educational materials to enhance their financial literacy.

SpendSense overcomes these problems by integrating the features of financial obligations management, payment monitoring, notifications, financial health score, rule-based insights, financial literacy quiz, and gamification in one single web application. The platform allows users to manage financial obligations, view future payments in a financial calendar, record payments made, get notifications and alerts, track a simulated explainable credit-health score, check financial insights, participate in financial literacy quizzes, earn experience points and coins, maintain streaks of payments and knowledge, win stickers, and manage their user profiles and application settings.

The scope of the SpendSense system and Demo 2 features include:
- User Authentication and Account Management
- User Profile and Application Preferences Management
- Dash Board Based Financial Summaries and Progress
- Financial Calendar and Payment Occurrence Tracking
- Financial Obligation and Recurring Payments Scheduling
- Payment Logging and Payment History Management
- Explainable Simulated Credit-Health Score Calculation
- Rule-Based Financial Statistics and Insights
- Daily and Topic-Based Financial Literacy Quizzes
- In App Payment Reminders and Notifications
- Payment and Knowledge Streaks Management
- Gamification Through Experience Points, Coins, Stickers and Badges
- In Application Help Resource, Tutorials and Frequently Asked Questions

The demo 2 scope will be based on five integrated use cases: simulated credit-health score, statistics based financial insights, financial literacy quizzes, notifications and reminders, and profile, settings and help.

Functionalities like receipt scanning and optical character recognition, AI-generated financial advice, advanced expense tracking, social features, leaderboards, mascot customisation, and Monthly Wrapped summaries are considered to be future features. They are not included in the committed Demo 2 scope because they will not be part of the functionality demonstrated and tested in Demo 2.

## 2. User Stories

## 3. Use Cases

### UC1: Financial Obligation Management
<img width="1256" height="1500" alt="Image" src="https://github.com/user-attachments/assets/48e9e14c-2273-4f44-8da7-607c0394f1f2" />

### UC1: Financial Obligation Management

#### UC1.1: Add obligation
**This use case begins with** the authorised user accessing the New obligation page, putting in the obligation amount, picking the type of obligation, and supplying the necessary information. This information could be the reason for the obligation, its priority level, due date, optional end date, frequency of payments, total occurrence, description, reminder choice, and notification medium.
**This use case ends with** the user choosing the “Log it” option, the financial obligation getting stored, and the mandatory payment occurrences as well as reminders being made in-app.

#### UC1.2: View obligation on calender
**This use case begins with** the authorised user accessing the financial calendar and seeing their financial obligations.
**This use case ends with** the ability of the user to see the obligation and the payment instances created from the obligation on the calendar, along with their dates, amounts, and payment statuses.

#### UC1.3: View obligation details
**This use case begins with** the authorised user selecting a financial obligation or one of its payment instances from the calendar or another available view of obligations.
**This use case ends with** the system showing the stored data for that obligation, which includes its amount, type, reason, priority, due date, optional end date, frequency, number of occurrences, description, reminder setting, notification channel, and payment status.

#### UC1.4: Edit obligation
**This use case begins with** the authorised user accessing an existing financial obligation and opting for its editing.
**This use case ends with** the modified information of the obligation getting saved and the future payments and their reminders, if any, getting updated.

#### UC1.5: Delete obligation
**This use case begins with** the user logging in, selecting the existing financial responsibility and deleting it.
**This use case ends with** the financial responsibility being deleted from the list of the user’s financial responsibilities as well as any notifications about them not appearing in the calendar anymore.

### UC2: Logging Payments
<img width="1292" height="2320" alt="Image" src="https://github.com/user-attachments/assets/b7c2fe78-b360-4d0b-87fd-182816841db9" />

#### UC2.1: Select a due payment
**This use case begins with** the authorised user opening the calendar or dashboard and choosing an outstanding payment occurrence.
**This use case ends with** the chosen payment occurrence appearing on the Add Payment page along with the name of obligation, payment type, payment status, and payment amount expected.

#### UC2.2: Enter payment method, date & amount
**This use case begins with** the authorised user selecting a pending payment and inputting the payment amount, date, payment method, and any notes.
**This use case ends with** the mandatory payment details being inputted and ready for submission.

#### UC2.3: Submit payment
**This use case begins with** the authorised user filling up the payment details and choosing the "Log Payment" button.
**This use case ends with** the payment being saved, the chosen payment occurrence being marked, and updating the relevant payment status, financial health score, rewards, and streaks.

#### UC2.4: Edit payment
**This use case begins with** an authorised user accessing an already existing payment record, and editing the selected record.
**This use case ends with** saving of the edited payment amount, date, payment method or notes, and updating of the payment and financial-health data.

#### UC2.5: Delete payment
**This use case begins with** an authorised user selecting an existing payment record, deleting the record and confirming the action.
**This use case ends with** deleting of the selected payment record and updating of the payment occurrence and financial-health data accordingly.

#### UC2.6: View payment history
**This use case begins with** an authorised user accessing the list of his/her previous payments.
**This use case ends with** viewing of the previous payments of the user along with their amounts, payment dates, obligations, and payment status.

### UC3: Gamification & Rewards
<img width="1300" height="1580" alt="Image" src="https://github.com/user-attachments/assets/26d4e2a6-fa67-4983-9f0b-e75aae72699d" />

#### UC3.1: View Credit score & Explination
**This use case begins with** the authorised user entering the dashboard or credit score page and choosing to check their credit score.
**This use case ends with** the user being able to check their current simulated credit score, score level, score breakdown, and the reason for the score.

#### UC3.2: View Badges
**This use case begins with** the authorised user entering the badge or sticker collection page.
**This use case ends with** the user being able to check their badges, which badges are currently unlocked, and the requirements for getting each badge.

#### UC3.3: View on-time payments streak
**This use case begins with** the authorised user entering the dashboard, profile or gamification pages to check their payments.
**This use case ends with** the user being able to check their current on-time payment streak and the maximum on-time payment streak achieved.

#### UC3.4: View coins balance
**This use case begins with** the authorised user entering the dashboard, profile or any other page to check their gamification progress.
**This use case ends with** the user being able to check the current coins balance earned from various financial activities.


### UC4: Credit Score
<img width="1260" height="972" alt="Image" src="https://github.com/user-attachments/assets/88a75ec7-8871-4ea4-a594-92b00b037606" />

#### UC4.1: View credit score on dashboard
**This use case begins with** the authorised user accesses the dashboard after login into the application.
**This use case ends with** the user can access their current simulated credit score and its most recent change in the dashboard.

#### UC4.2: View Credit score breakdown
**This use case begins with** the authorised user views his/her simulated credit score breakdown from the dashboard.
**This use case ends with**  the system displays the key factors that contribute to determining the user's score, which includes on-time payments, budget utilization and late payment count.

#### UC4.3: View Credit score tier
**This use case begins with** the authorised user accesses the dashboard for his/her current score classification.
**This use case ends with** the user gets to see the tier corresponding to the user's current credit score.

### UC5: Stats-based Insights
<img width="1260" height="1560" alt="Image" src="https://github.com/user-attachments/assets/afdc53cb-74cf-4432-84be-3c31f209141f" />

#### UC5.1: View spending category breakdown
**This use case begins with** The authorised user visits the insights page and picks the category breakdown of spending.
**This use case ends with** The user will be in a position to see how his/her financial obligations are spread out within the different obligation categories.

#### UC5.2: View spending trends
**This use case begins with** The authorised user visits the insights page in order to analyze the changes in his/her financial obligations.
**This use case ends with** The user is able to determine the relationship between his/her current financial obligation and the previous one whether it has gone up, down or remains the same.

#### UC5.3: View on-time payment rate
**This use case begins with** The authorised user visits the insights page and analyzes his/her payment performance.
**This use case ends with** The user can identify the percent of his/her payments made on time and compare it with the previous period.

#### UC5.4: View upcoming payment pressure
**This use case begins with** the authorised user accesses the insights page to check the payments that have to be paid in the coming period.
**This use case ends with** the user can check how many and how much is to be paid for the upcoming payments and whether those payments bring about increased financial pressure.

#### UC5.5: View streak behavior
**This use case begins with** the authorised user accesses the insights page to check his/her payment streak behaviour.
**This use case ends with** the user can check his/her behaviour-based details like streak of on-time payments and missed payments during the present period.

### UC6: Financial Literacy Quiz
<img width="1272" height="1968" alt="Image" src="https://github.com/user-attachments/assets/0cb385ac-d2f4-45df-b9e9-fb6c4f4b08f2" />

#### UC6.1: Do daily quiz
**This use case begins with** the authorised user accesses the quiz page and chooses the daily quiz.
**This use case ends with** the user answers all the daily quiz questions correctly, finishes the session, and earns coins, experience points, and gains knowledge streak progress.

#### UC6.2: Resume incomplete quiz
**This use case begins with** the authorised user returns to the quiz page but has an incomplete quiz session.
**This use case ends with** the unfinished quiz session is revived and the user continues answering the current question without losing any previous progress.

#### UC6.3: View financial topic quizzes
**This use case begins with** the authorised user accesses the quiz page and accesses the financial topic quizzes.
**This use case ends with** the user can see the quizzes on the selected financial topic.

#### UC6.4: Do financial topic lesson & quiz
**This use case begins with** the authorised user selecting a financial topic and opening its lesson.
**This use case ends with** the user reading the lesson, completing the related quiz questions, and receiving their quiz results and applicable rewards.

#### UC6.5: View knowledge streak
**This use case begins with** the authorised user accesses the quiz, dashboard, or profile page to see their progress in learning.
**This use case ends with** the user can see their current knowledge streak and the longest recorded knowledge streak.

#### UC6.6: View question feedback
**This use case begins with** the authorised user selects and submits the answer to the quiz question.
**This use case ends with** the system showing if the answer is right or wrong, gives an explanation, and requeues the question when needed.

#### UC6.7: View quiz results
**This use case begins with** the authorised user answers all the questions correctly in order to pass the quiz session.
**This use case ends with** the user is able to view their quiz results.

### UC7: Notifications & Reminders
<img width="1276" height="1404" alt="Image" src="https://github.com/user-attachments/assets/26a0995a-cbf2-495e-b40e-d7b3f7fee22b" />

#### UC7.1: View notifications inbox
**This use case begins with** he authorised user clicks on the notifications icon to see the notifications inbox.
**This use case ends with** the user is able to see his payment reminders, overdue payments notification, changes in the credit score, and badge or reward notifications with their read/unread status.

#### UC7.2: Mark notification as read
**This use case begins with** the authorised user clicks on an unread notification from the notifications inbox.
**This use case ends with** the notification is marked as read, and the user’s unread notifications number is updated.

#### UC7.3: Filter notifications by type
**This use case begins with** the authorised user clicks on the notifications inbox and chooses the notification type to filter the notifications.
**This use case ends with** the notifications inbox shows the filtered notifications according to the chosen notification type.

#### UC7.4: Set reminders preferences
**This use case begins with** the authorised user setting up the notification and reminder settings by choosing how many days prior to payment the user would like to be reminded about it.
**This use case ends with** the reminder preference being stored and applied for future in-app payment reminder scheduling.

#### UC7.5: Manage inbox
**This use case begins with** the authorised user managing the notifications from the notifications inbox.
**This use case ends with** the user is able to open the notifications, select specific notifications or all and mark as read or delete.


### UC8: Profile Page
<img width="1268" height="1712" alt="Image" src="https://github.com/user-attachments/assets/e1588b34-4823-4392-9ed8-bf109c6bed5d" />

#### UC8.1: View profile page
**This use case begins with** the authorized user accesses the profile page using the application navigation menu.
**This use case ends with** the user is able to view their profile data, progress financially, credit score tier, streaks, coins, experience points, and rewards.

#### UC8.2: Edit profile details
**This use case begins with** the authorized user accesses the profile page and updates their profile details.
**This use case ends with** the updated profile details like the user’s display name, profile picture, and monthly budget are saved and shown in the profile page.

#### UC8.3: Edit settings
**This use case begins with** the authorized user accesses the settings page and modifies application preferences.
**This use case ends with** the preferences are saved in the user’s account.

#### UC8.4: View help & support
**This use case begins with** the verified user clicking on the help and support link from their profile or settings page.
**This use case ends with** the user being able to access information such as FAQs, tutorials, and description of the application’s financial and gamification aspects.

#### UC8.5: View sticker album
**This use case begins with** the verified user clicking on the sticker album link from their profile page.
**This use case ends with** the user being able to access their stickers which have been locked and earned along with the information about those stickers.

#### UC8.6: View insights
**This use case begins with** the verified user clicking on the insights link from their profile page.
**This use case ends with** the user being able to access their financial statistics and insights according to their obligations and payment patterns.

## 4. Funtional Requirements

## 5. Non-Functional Requirements

## 6. Domain Model