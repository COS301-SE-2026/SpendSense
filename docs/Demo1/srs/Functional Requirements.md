>**A NOTE ON JARGON:** 
* A **Financial Obligation** Refers to some expense that the logged-in user will have to satisfy buy some due date.
* The term **Payment** will be used in regards to the user action of **Logging a *Payment***.

The examples provided below the functionaly requirements will further emphasize this distincition. 



# FR1: Financial Obligation Management

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

# FR2: Logging Payments

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

# FR3: Gamification & rewards

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
