## US1: Financial Obligation Management

### US1.1: Add an Obligation
#### User story
As a User
I want to add a new financial obligation
So that I can track recurring or one-off payments in my dashboard
#### Acceptance criteria
Given I am logged into the app
When I fill in all required fields (type, amount, recurrence) and submit
Then the obligation is created and displayed on my calendar/timeline

### US1.2: View Obligation on calendar
#### User story
As a User
I want to view obligations on the calendar
So that I can see when payments are due
#### Acceptance criteria
Given I have at least one obligation
When I open the calendar view
Then I can see all upcoming obligations with date, type, and amount

### US1.3: View Obligation details
#### User story
As a User
I want to view obligation details
So that I can see more information about each payment, including history and notes
#### Acceptance criteria
Given I am viewing the calendar or list of obligations
When I select a specific obligation
Then I see full details including payment history, notes, and recurrence settings

### US1.4: Edit Obligation
#### User story
As a User
I want to edit an existing obligation
So that I can correct mistakes or update payment details
#### Acceptance criteria
Given an obligation exists
When I open the edit form and update fields
Then the obligation is updated and changes are reflected on the calendar/timeline

### US1.5: Delete Obligation
#### User story
As a User
I want to delete an obligation
So that I can remove payments that are no longer relevant
#### Acceptance criteria
Given an obligation exists
When I select delete and confirm
Then the obligation is removed from my list and calendar view


## US2: Logging payments
### US2.1: Select a due Financial obligations for payment from the Dashboard or Calendar
#### User Story
As a User
I want to select a due financial obligation from my dashboard or timeline
So that I can log a payment for an obligation
#### Acceptance criteria
Given I have at least one upcoming payment
When I navigate to the dashboard or timeline
Then I can select a specific financial obligation to act on

### US2.2: Enter a payment Method, Date & Amount 
#### User Story
As a User
I want to enter the payment method, date, and amount
So that the system can accurately record my payment
#### Acceptance criteria
Given I have selected a due payment
When I fill in the payment method, date, and amount fields
Then the system validates the inputs before submission

### US2.3: Submit Payment 
#### User Story
As a User
I want to submit the payment after entering details
So that the system records the transaction and updates my obligations
#### Acceptance criteria
Given I have entered valid payment details
When I click the submit button
Then the payment is recorded and the payment occurrence status updates

### US2.4: Edit Payment
#### User Story
As a User
I want to edit a payment I previously logged
So that I can correct mistakes in the payment details
#### Acceptance criteria
Given a payment has been submitted
When I select the payment and update the details
Then the changes are saved and reflected in the payment history

### US2.5: Delete Payment 
#### User Story
As a User
I want to delete a payment I previously logged
So that I can remove incorrect or duplicate entries
#### Acceptance criteria
Given a payment exists in my history
When I choose to delete and confirm
Then the payment is removed and the payment occurrence is marked as unpaid

### US2.6: View Payment history 
#### User Story
As a User
I want to view my payment history
So that I can track all past payments for my obligations
#### Acceptance criteria
Given I have logged payments
When I open the payment history screen
Then I can see a list of all past payments with date, amount, and method


## US3: Gamification & rewards
#### US3.1: View Credit score & Explanation 
#### User Story
As a User
I want to view my credit score along with an explanation
So that I understand my current financial standing and the factors affecting it
#### Acceptance criteria
Given I have logged payments
When I open the credit score screen
Then I can see my score and a breakdown/explanation of contributing factors

#### US3.2: View badges 
#### User Story
As a User
I want to view all badges I have earned
So that I can track my achievements and progress
#### Acceptance criteria
Given I have completed actions that award badges
When I open the badges screen
Then I see all badges earned with descriptions and unlock dates

#### US3.3: View on-time payments streak: 
#### User Story
As a User
I want to view my on-time payment streak
So that I can monitor my consistency in making payments on time
#### Acceptance criteria
Given I have logged payments
When I view my streak screen
Then I can see the current streak and historical streak data

#### US3.4: View coins balance
#### User Story
As a User
I want to view my coins balance
So that I know how many coins I have earned from actions and payments
#### Acceptance criteria
Given I have completed actions that earn coins
When I view my coin balance screen
Then I see the total coins and a transaction log if available

#### US3.5: Change mascots outfit 
#### User Story
As a User
I want to change my mascot’s outfit
So that I can personalise my gamification experience
#### Acceptance criteria
Given I have unlocked outfits
When I select a new outfit for my mascot
Then the mascot’s appearance updates and is reflected across the app