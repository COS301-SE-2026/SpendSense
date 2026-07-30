import {expect, test} from './fixtures';

test.describe('Profile', ()=> {
    test('shows real identity, tier, streak and coins from GET /users/me', async ({
        page,
        scenario,
    })=> {
        const {progress}=await scenario.profile.userWithProgress({
            progress:{
                mascotLevel: 6,
                coinBalance: 1250,
                currentPaymentStreak: 28,
                scoreTier: 'GOOD',
            },
        });

        await page.goto('/profile');

        await expect(page.getByRole('heading', {name: 'E2E Browser User'})).toBeVisible();
        await expect(page.getByText(new RegExp(`level ${progress.mascotLevel}`, 'i'))).toBeVisible();
        await expect(page.getByText(/good/i)).toBeVisible();
        await expect(page.getByText(new RegExp(`${progress.currentPaymentStreak} day streak`, 'i')),).toBeVisible();
        await expect(page.getByText(new RegExp(`${progress.coinBalance.toLocaleString()} coins`)),).toBeVisible();
    });

    test.skip('Edit Profile save updates the display name and reflects it on profile', async({
        page,
        scenario,
    })=> {
        await scenario.profile.userWithProgress();
        await page.goto('/profile');
        await page.getByRole('link', {name: /edit profile/i}).click();
        
        const nameField=page.getByLabel(/display name/i);
        await expect(nameField).toHaveValue('E2E Browser User');

        await nameField.fill('E2E Renamed User');
        await page.getByRole('button', {name: /save changes/i}).click();

        await expect(page.getByText(/profile updated/i)).toBeVisible();
        await page.goto('/profile');
        await expect(page.getByRole('heading', {name: 'E2E Renamed User'})).toBeVisible();
    });


    test.skip('Preferences theme change persists across reload', async({
        page,
        scenario,
    })=> {
        await scenario.profile.userWithProgress();

        await page.goto('/profile');
        await page.getByRole('link', {name: /^settings$/i}).click();
        await page.getByRole('link', {name: /general preferences/i}).click();

        await expect(page.getByRole('button', {name: 'System'})).toHaveAttribute('aria-pressed', 'true',);

        await page.getByRole('button', {name: 'Dark'}).click();
        await page.getByRole('button', {name: /save preferences/i}).click();
        await expect(page.getByText(/preferences saved/i)).toBeVisible();

        await page.reload();
        await expect(page.getByRole('button', {name: 'Dark'})).toHaveAttribute('aria-pressed', 'true',);
    });

    test('Wrapped row on Profile redirects to Insights', async({
        page,
        scenario,
    })=> {
        await scenario.profile.userWithProgress();
        await page.goto('/profile');
        await page.getByRole('link', {name: /wrapped/i}).click();
        await expect(page).toHaveURL(/\/insights$/);
    });


    test('Help & Support renders walkthrough and expandable FAQ', async({
        page,
        scenario,
    })=>{
        await scenario.profile.userWithProgress();
        await page.goto('/profile');
        await page.getByRole('link', {name: /help & support/i}).click();

        await expect(page.getByText(/1\. start on the dashboard/i)).toBeVisible();
        await expect(page.getByText(/is my credit score real\?/i)).toBeVisible();

        await page.getByRole('button', {name: /is my credit score real\?/i}).click();
        await expect(page.getByText(/simulation built for learning/i)).toBeVisible();
    });
});