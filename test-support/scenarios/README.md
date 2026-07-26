# Scenarios

Scenarios assemble a reusable business starting state from factories. For example, a payable occurrence scenario creates the user, obligation, schedule, and occurrence that define that state.

Add a scenario when more than one test needs the same named business situation. A one-off setup belongs in the relevant E2E spec and should use factories directly.
