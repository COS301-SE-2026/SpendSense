import {expect,test} from './fixtures'

async function startBriefing(page:import('@playwright/test').Page){
    await page.goto('/simulation')
    await page.getByRole('button',{name:'Start simulation'}).click()
    await expect(page.getByRole('heading',{name:'How it works'}).first()).toBeVisible()
    await page.getByRole('button',{name:'Continue'}).click()
    await expect(page).toHaveURL(/\/simulation\/setup\/[^/]+$/)
    await expect(page.getByRole('heading',{name:'Set up your budget'}).first()).toBeVisible()
}

test.describe('Simulated Month',()=>{
    test('a player can create a month and review a budget before starting',async({page})=>{
        await startBriefing(page)
        await expect(page.getByRole('button',{name:'Review your month'})).toBeDisabled()
        await page.getByRole('radio',{name:/80.*20/}).check()
        await expect(page.getByRole('button',{name:'Review your month'})).toBeEnabled()
        await page.getByRole('button',{name:'Review your month'}).click()
        await expect(page.getByRole('heading',{name:'Your month at a glance'})).toBeVisible()
        await expect(page.getByText('Planning does not make payments or change your score.')).toBeVisible()
        await page.getByRole('button',{name:'Start month'}).click()
        await expect(page).toHaveURL(/\/simulation\/session\/[^/]+\/board$/)
        await page.reload()
        await expect(page).toHaveURL(/\/simulation\/session\/[^/]+\/board$/)
    })
    test('easy mode lets the player create an untimed month',async({page})=>{
        await page.goto('/simulation')
        await page.getByRole('button',{name:'Start simulation'}).click()
        await page.getByRole('checkbox',{name:'Easy mode'}).check()
        const created=page.waitForResponse(response=>
            response.url().endsWith('/simulations')&&
            response.request().method()==='POST'&&
            response.ok()
        )
        await page.getByRole('button',{name:'Continue'}).click()
        const response=await created
        const body=await response.json()
        expect(body.data.timedMode).toBe(false)
        await expect(page).toHaveURL(/\/simulation\/setup\/[^/]+$/)
    })
    test('an invalid custom budget cannot proceed',async({page})=>{
        await startBriefing(page)
        const current=page.getByLabel('Or choose a custom Current amount')
        await current.fill('123')
        await expect(current).toHaveAttribute('aria-invalid','true')
        await expect(page.getByRole('button',{name:'Review your month'})).toBeDisabled()
        await current.fill('1000')
        await expect(current).toHaveAttribute('aria-invalid','false')
        await expect(page.getByRole('button',{name:'Review your month'})).toBeEnabled()
    })
    test('a saved briefing can be resumed after returning to the entry screen',async({page})=>{
        await startBriefing(page)
        const setupUrl=page.url()
        await page.goto('/simulation')
        await expect(page.getByText('Your fictional month is waiting')).toBeVisible()
        await page.getByRole('button',{name:'Resume'}).click()
        await expect(page).toHaveURL(setupUrl)
        await expect(page.getByRole('heading',{name:'Set up your budget'}).first()).toBeVisible()
    })
    test('discarding a briefing removes it from the active month screen',async({page})=>{
        await startBriefing(page)
        await page.goto('/simulation')
        await page.getByRole('button',{name:'Discard',exact:true}).click()
        await expect(page.getByText('Discard this fictional month?')).toBeVisible()
        await page.getByRole('button',{name:'Keep simulation'}).click()
        await expect(page.getByText('Your fictional month is waiting')).toBeVisible()
        await page.getByRole('button',{name:'Discard',exact:true}).click()
        await page.getByRole('button',{name:'Discard run'}).click()
        await expect(page.getByRole('button',{name:'Start simulation'})).toBeVisible()
        await page.reload()
        await expect(page.getByRole('button',{name:'Start simulation'})).toBeVisible()
    })
    test('the simulation information explains that the money is fictional',async({page})=>{
        await page.goto('/simulation/briefing')
        await page.getByRole('button',{name:'About Simulated Month'}).click()
        const dialog=page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        await expect(dialog.getByText(/fictional/i).first()).toBeVisible()
        await dialog.getByRole('button',{name:'Close information'}).click()
        await expect(dialog).toHaveCount(0)
    })
})
