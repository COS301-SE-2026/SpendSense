import {expect, test} from './fixtures';

const dashboard='/domains/dashboard';
const tourDialog=(page: import('@playwright/test').Page)=>
    page.getByRole('dialog', {name: /./});

test.describe('Mascot guidance', ()=> {
    test.describe('guided tour', ()=> {
        test('a new user is invited to the tour and can walk through it across screens', async ({
            page,
            scenario,
        })=> {
            await scenario.guidance.userWithState({walkthroughStatus: 'NOT_STARTED'});

            await page.goto(dashboard);
            await expect(page.getByRole('heading', {name: 'Want a quick tour?'})).toBeVisible();

            await page.getByRole('button', {name: 'Take the tour'}).click();

            const panel=tourDialog(page);
            await expect(panel.getByRole('heading', {name: 'Your home base'})).toBeVisible();
            await expect(panel.getByText(/step 1 of 5/i)).toBeVisible();
            await expect(panel.getByRole('button', {name: 'Back'})).toBeDisabled();

            await panel.getByRole('button', {name: 'Next'}).click();
            await expect(panel.getByRole('heading', {name: 'Your simulated score'})).toBeVisible();

            await panel.getByRole('button', {name: 'Back'}).click();
            await expect(panel.getByRole('heading', {name: 'Your home base'})).toBeVisible();

            for(let click=0; click<5; click+=1){
                await panel.getByRole('button', {name: 'Next'}).click();
            }
            await expect(page).toHaveURL(/\/calendar$/);
            await expect(panel.getByRole('heading', {name: 'Your month at a glance'})).toBeVisible();
            await expect(panel.getByText(/step 2 of 5/i)).toBeVisible();
        });

        test('skipping the tour closes it and it stays skipped after a reload', async ({
            page,
            scenario,
        })=> {
            await scenario.guidance.userWithState({walkthroughStatus: 'NOT_STARTED'});

            await page.goto(dashboard);
            await page.getByRole('button', {name: 'Take the tour'}).click();
            await expect(tourDialog(page)).toBeVisible();

            await tourDialog(page).getByRole('button', {name: 'Skip'}).click();
            await expect(tourDialog(page)).toBeHidden();

            await page.reload();
            await expect(page.getByRole('button', {name: 'Hide your mascot guide'})).toBeVisible();
            await expect(page.getByRole('heading', {name: 'Want a quick tour?'})).toHaveCount(0);
            await expect(tourDialog(page)).toHaveCount(0);
        });

        test('Escape closes the tour', async ({page, scenario})=> {
            await scenario.guidance.userWithState({walkthroughStatus: 'NOT_STARTED'});

            await page.goto(dashboard);
            await page.getByRole('button', {name: 'Take the tour'}).click();
            await expect(tourDialog(page)).toBeVisible();

            await page.keyboard.press('Escape');
            await expect(tourDialog(page)).toBeHidden();
        });

        test('a paused tour offers to resume from the step where it stopped', async ({
            page,
            scenario,
        })=> {
            await scenario.guidance.userWithState({
                walkthroughStatus: 'IN_PROGRESS',
                walkthroughStep: 2,
            });

            await page.goto(dashboard);
            await expect(page.getByRole('heading', {name: 'Your tour is paused'})).toBeVisible();
            await expect(page.getByText('You stopped at step 3 of 5.')).toBeVisible();

            await page.getByRole('button', {name: 'Resume the tour'}).click();
            await expect(tourDialog(page).getByText(/step 3 of 5/i)).toBeVisible();
        });

        test('a completed tour is not offered again', async ({page, scenario})=> {
            await scenario.guidance.userWithState({
                walkthroughStatus: 'COMPLETED',
                walkthroughStep: 4,
            });

            await page.goto(dashboard);
            await expect(page.getByRole('button', {name: 'Hide your mascot guide'})).toBeVisible();
            await expect(page.getByRole('heading', {name: 'Want a quick tour?'})).toHaveCount(0);
            await expect(page.getByRole('heading', {name: 'Your tour is paused'})).toHaveCount(0);
        });
    });

    test.describe('dashboard mascot dock', ()=> {
        test.afterEach(async ({scenario})=> {
            await scenario.guidance.userWithState(
                {walkthroughStatus: 'COMPLETED'},
                {dailyQuizCompleted: false},
            );
        });

        test('opens today\'s guide automatically when tips are on', async ({page, scenario})=> {
            await scenario.guidance.userWithState(
                {
                    walkthroughStatus: 'COMPLETED',
                    tipsEnabled: true,
                    dailyExpansionEnabled: true,
                },
                {dailyQuizCompleted: true},
            );

            await page.goto(dashboard);

            const card=page.getByTestId('guide-card');
            await expect(card).toBeVisible();
            await expect(card).toHaveAttribute('data-guide-variant', 'bubble');
        });

        test('does not open a guide automatically when daily expansion is off', async ({
            page,
            scenario,
        })=> {
            await scenario.guidance.userWithState({
                walkthroughStatus: 'COMPLETED',
                dailyExpansionEnabled: false,
            });

            await page.goto(dashboard);

            await expect(page.getByRole('button', {name: 'Hide your mascot guide'})).toBeVisible();
            await expect(page.getByTestId('guide-card')).toHaveCount(0);
        });

        test('shows no tips at all when tips are turned off', async ({page, scenario})=> {
            await scenario.guidance.userWithState({
                walkthroughStatus: 'COMPLETED',
                tipsEnabled: false,
            });

            await page.goto(dashboard);

            await expect(page.getByRole('button', {name: 'Hide your mascot guide'})).toBeVisible();
            await expect(page.getByTestId('guide-card')).toHaveCount(0);
        });

        test('the mascot can be sent off screen and brought back', async ({page, scenario})=> {
            await scenario.guidance.userWithState(
                {walkthroughStatus: 'COMPLETED'},
                {dailyQuizCompleted: true},
            );

            await page.goto(dashboard);
            await expect(page.getByTestId('guide-card')).toBeVisible();

            await page.getByRole('button', {name: 'Hide your mascot guide'}).click();
            await expect(page.getByRole('button', {name: 'Hide your mascot guide'})).toHaveCount(0);
            await expect(page.getByTestId('guide-card')).toHaveCount(0);

            await page.getByRole('button', {name: 'Bring your mascot guide back'}).click();
            await expect(page.getByRole('button', {name: 'Hide your mascot guide'})).toBeVisible();
            await expect(page.getByTestId('guide-card')).toBeVisible();
        });

        test.fixme('a dismissed tip stays hidden after a reload', async ({page, scenario})=> {
            await scenario.guidance.userWithState(
                {walkthroughStatus: 'COMPLETED'},
                {dailyQuizCompleted: true},
            );

            await page.goto(dashboard);

            const card=page.getByTestId('guide-card');
            await expect(card).toBeVisible();
            const guideId=await card.getAttribute('data-guide-id');
            const dismiss=card.getByRole('button', {name: 'Hide this tip'});

            test.skip(!(await dismiss.count()), `guide ${guideId} is not dismissible`);

            await dismiss.click();
            await expect(page.locator(`[data-guide-id="${guideId}"]`)).toHaveCount(0);

            await page.reload();
            await expect(page.getByRole('button', {name: 'Hide your mascot guide'})).toBeVisible();
            await page.getByRole('button', {name: 'Hide your mascot guide'}).click();
            await page.getByRole('button', {name: 'Bring your mascot guide back'}).click();
            await expect(page.locator(`[data-guide-id="${guideId}"]`)).toHaveCount(0);
        });
    });

    test.describe('guidance settings', ()=> {
        const tipsSwitch='Show tips from your mascot';

        test('turning tips off saves and persists after a reload', async ({page, scenario})=> {
            await scenario.guidance.userWithState({tipsEnabled: true});

            await page.goto('/settings/preferences');

            const toggle=page.getByRole('switch', {name: tipsSwitch});
            await expect(toggle).toHaveAttribute('aria-checked', 'true');

            const saved=page.waitForResponse(
                (response)=>
                    response.url().includes('/guidance/state') &&
                    response.request().method()==='PATCH' &&
                    response.ok(),
            );
            await toggle.click();
            await saved;
            await expect(toggle).toHaveAttribute('aria-checked', 'false');

            await page.reload();
            await expect(page.getByRole('switch', {name: tipsSwitch})).toHaveAttribute(
                'aria-checked',
                'false',
            );
        });

        test('turning the automatic daily guide off persists after a reload', async ({
            page,
            scenario,
        })=> {
            await scenario.guidance.userWithState({dailyExpansionEnabled: true});

            await page.goto('/settings/preferences');

            const name="Open today's guide automatically on the dashboard";
            const toggle=page.getByRole('switch', {name});
            await expect(toggle).toHaveAttribute('aria-checked', 'true');

            const saved=page.waitForResponse(
                (response)=>
                    response.url().includes('/guidance/state') &&
                    response.request().method()==='PATCH' &&
                    response.ok(),
            );
            await toggle.click();
            await saved;

            await page.reload();
            await expect(page.getByRole('switch', {name})).toHaveAttribute('aria-checked', 'false');
        });

        test('Start the tour replays the walkthrough after it was completed', async ({
            page,
            scenario,
        })=> {
            await scenario.guidance.userWithState({
                walkthroughStatus: 'COMPLETED',
                walkthroughStep: 4,
            });

            await page.goto('/settings/preferences');
            await page.getByRole('button', {name: 'Start the tour'}).click();

            await expect(page).toHaveURL(/\/domains\/dashboard$/);
            await expect(
                tourDialog(page).getByRole('heading', {name: 'Your home base'}),
            ).toBeVisible();
            await expect(tourDialog(page).getByText(/step 1 of 5/i)).toBeVisible();
        });

        test('Show hidden tips again is only enabled when tips have been hidden', async ({
            page,
            scenario,
        })=> {
            await scenario.guidance.userWithState({dismissedTipIds: []});

            await page.goto('/settings/preferences');
            await expect(
                page.getByRole('button', {name: 'Show hidden tips again'}),
            ).toBeDisabled();
        });
    });
});
