# Scenarios

Scenarios assemble a reusable business starting state from factories. For example, a payable occurrence scenario creates the user, obligation, schedule, and occurrence that define that state.

Add a scenario when more than one test needs the same named business situation. A one-off setup belongs in the relevant E2E spec and should use factories directly.

`payments.ts` is the reference example. `createUserWithUpcomingPayment()` creates an isolated user, finds the seeded Rent category, and creates a valid payable occurrence through the payment factory.

Browser tests use the same scenario through `server.ts`. Register only named scenarios that browser specs actually need, then expose the scenario through `frontend/e2e/fixtures.ts`.
