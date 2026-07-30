import {expect,test} from './fixtures';

test('starts a daily quiz and submits an answer',async({
    page,
    scenario,
})=>{
    await scenario.quizzes.userReadyForDailyQuiz();
    await page.goto('/quiz');
    await expect(
        page.getByRole('heading',{name:'Financial Quiz'}),
    ).toBeVisible();
    await page.getByRole('button',{name:'Start daily quiz'}).click();
    await expect(page).toHaveURL(/\/quiz\/session\/[^/]+$/);
    await expect(
        page.getByRole('heading',{name:/Question 1 of \d+/}),
    ).toBeVisible();
    const answerOptions=page
        .getByRole('group',{name:'Answer options'})
        .getByRole('button');
    await expect(answerOptions.first()).toBeVisible();
    await answerOptions.first().click();
    await page.getByRole('button',{name:'Submit Answer'}).click();
    await expect(page.getByRole('status')).toContainText(
        /Correct!|Not quite/,
    );
});