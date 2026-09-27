import {randomUUID} from 'node:crypto'
import {createApiE2eFixture} from './fixtures'

describe('Simulations E2E',()=>{
    it('creates a briefing and returns it as the active simulation',async()=>{
        const e2e=await createApiE2eFixture()
        try{
            const {api,token}=await e2e.user()
            const created=await api
                .post('/api/v1/simulations')
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({timedMode:false})
            expect(created.status).toBe(201)
            const session=created.body.data
            expect(session.id).toBeDefined()
            expect(session.status).toBe('BRIEFING')
            expect(session.timedMode).toBe(false)
            expect(session.briefing.allocationOptions.length).toBeGreaterThan(0)
        }finally{
            await e2e.close()
        }
    })
    it('replays a creation request with the same idempotency key',async()=>{
        const e2e=await createApiE2eFixture()
        try{
            const {api,token}=await e2e.user()
            const key=randomUUID()
            const create=()=>api
                .post('/api/v1/simulations')
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',key)
                .send({timedMode:false})
            const first=await create().expect(201)
            const second=await create().expect(201)
            expect(second.body.data.id).toBe(first.body.data.id)
            expect(second.body.data.replayed).toBe(true)
        }finally{
            await e2e.close()
        }
    })
    it('sets up the selected budget and persists the active session',async()=>{
        const e2e=await createApiE2eFixture()
        try{
            const {api,token}=await e2e.user()
            const created=await api
                .post('/api/v1/simulations')
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({timedMode:false})
                .expect(201)
            const session=created.body.data
            const allocation=session.briefing.allocationOptions[0]
            const setup=await api
                .post(`/api/v1/simulations/${session.id}/setup`)
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({allocationId:allocation.id})
                .expect(201)
            expect(setup.body.data.session.status).toBe('ACTIVE')
            const detail=await api
                .get(`/api/v1/simulations/${session.id}`)
                .set('Authorization',`Bearer ${token}`)
                .expect(200)
            expect(detail.body.data.session.status).toBe('ACTIVE')
            expect(detail.body.data.allocation.selected.id).toBe(allocation.id)
            expect(detail.body.data.session.currentBalance).toBe(allocation.currentAmount)
            expect(detail.body.data.session.savingsBalance).toBe(allocation.savingsAmount)
        }finally{
            await e2e.close()
        }
    })
    it('pauses and resumes an active month without losing its progress',async()=>{
        const e2e=await createApiE2eFixture()
        try{
            const {api,token}=await e2e.user()
            const created=await api
                .post('/api/v1/simulations')
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({timedMode:false})
                .expect(201)
            const session=created.body.data
            await api
                .post(`/api/v1/simulations/${session.id}/setup`)
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({allocationId:session.briefing.allocationOptions[0].id})
                .expect(201)
            const paused=await api
                .patch(`/api/v1/simulations/${session.id}/status`)
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({action:'pause'})
                .expect(200)
            expect(paused.body.data.session.status).toBe('PAUSED')
            const resumed=await api
                .patch(`/api/v1/simulations/${session.id}/status`)
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({action:'resume'})
                .expect(200)
            expect(resumed.body.data.session.status).toBe('ACTIVE')
            expect(resumed.body.data.session.currentDay).toBe(paused.body.data.session.currentDay)
        }finally{
            await e2e.close()
        }
    })
    it('discards a month and clears the active session',async()=>{
        const e2e=await createApiE2eFixture()
        try{
            const {api,token}=await e2e.user()
            const created=await api
                .post('/api/v1/simulations')
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({timedMode:false})
                .expect(201)
            const sessionId=created.body.data.id
            const discarded=await api
                .patch(`/api/v1/simulations/${sessionId}/status`)
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({action:'discard'})
                .expect(200)
            expect(discarded.body.data.session.status).toBe('ABANDONED')
            const active=await api
                .get('/api/v1/simulations/active')
                .set('Authorization',`Bearer ${token}`)
                .expect(200)
            expect(active.body.data.active).toBeNull()
        }finally{
            await e2e.close()
        }
    })
    it('does not let another player read a private simulation',async()=>{
        const e2e=await createApiE2eFixture()
        try{
            const first=await e2e.user()
            const second=await e2e.user()
            const created=await first.api
                .post('/api/v1/simulations')
                .set('Authorization',`Bearer ${first.token}`)
                .set('Idempotency-Key',randomUUID())
                .send({timedMode:false})
                .expect(201)
            await second.api
                .get(`/api/v1/simulations/${created.body.data.id}`)
                .set('Authorization',`Bearer ${second.token}`)
                .expect(404)
        }finally{
            await e2e.close()
        }
    })
    it('advances the simulation by one day and persists the progress',async()=>{
        const e2e=await createApiE2eFixture()
        try{
            const {api,token}=await e2e.user()
            const created=await api
                .post('/api/v1/simulations')
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({timedMode:false})
                .expect(201)
            const session=created.body.data
            await api
                .post(`/api/v1/simulations/${session.id}/setup`)
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({allocationId:session.briefing.allocationOptions[0].id})
                .expect(201)
            const advanced=await api
                .post(`/api/v1/simulations/${session.id}/advance`)
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .expect(201)
            expect(advanced.body.data.session.currentDay).toBe(1)
            expect(advanced.body.data.session.status).toBe('ACTIVE')
            const detail=await api
                .get(`/api/v1/simulations/${session.id}`)
                .set('Authorization',`Bearer ${token}`)
                .expect(200)
            expect(detail.body.data.session.currentDay).toBe(1)
        }finally{
            await e2e.close()
        }
    })
    it('pays an obligation and updates the fictional balances',async()=>{
        const e2e=await createApiE2eFixture()
        try{
            const {api,token}=await e2e.user()
            const created=await api
                .post('/api/v1/simulations')
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({timedMode:false})
                .expect(201)
            const session=created.body.data
            const allocation=session.briefing.allocationOptions[0]
            const obligation=session.briefing.obligations[0]
            await api
                .post(`/api/v1/simulations/${session.id}/setup`)
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({allocationId:allocation.id})
                .expect(201)
            const paid=await api
                .post(`/api/v1/simulations/${session.id}/obligations/${obligation.id}/pay`)
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .expect(201)
            expect(paid.body.data.payment.obligationId).toBe(obligation.id)
            expect(paid.body.data.payment.amountDue).toBe(obligation.amountDue)
            expect(paid.body.data.session.currentBalance).toBe(
                (Number(allocation.currentAmount)-Number(obligation.amountDue)).toFixed(2)
            )
            expect(paid.body.data.session.savingsBalance).toBe(allocation.savingsAmount)
            const detail=await api
                .get(`/api/v1/simulations/${session.id}`)
                .set('Authorization',`Bearer ${token}`)
                .expect(200)
            const updated=detail.body.data.obligations.find(
                (item:{id:string})=>item.id===obligation.id
            )
            expect(updated.status).toBe('PAID')
            expect(updated.paidAt).not.toBeNull()
        }finally{
            await e2e.close()
        }
    })
    it('resolves a surprise event and persists the selected decision',async()=>{
        const e2e=await createApiE2eFixture()
        try{
            const {api,token}=await e2e.user()
            const created=await api
                .post('/api/v1/simulations')
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({timedMode:false})
                .expect(201)
            const session=created.body.data
            await api
                .post(`/api/v1/simulations/${session.id}/setup`)
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({allocationId:session.briefing.allocationOptions[0].id})
                .expect(201)
            let detail
            let event
            for(let day=0;day<30;day++){
                const advanced=await api
                    .post(`/api/v1/simulations/${session.id}/advance`)
                    .set('Authorization',`Bearer ${token}`)
                    .set('Idempotency-Key',randomUUID())
                    .expect(201)
                detail=advanced.body.data
                if(detail.currentEvent){
                    event=detail.currentEvent
                    break
                }
                if(detail.session.pending.type==='NEW_OBLIGATION'){
                    await api
                        .post(`/api/v1/simulations/${session.id}/continue`)
                        .set('Authorization',`Bearer ${token}`)
                        .set('Idempotency-Key',randomUUID())
                        .expect(201)
                }
            }
            expect(event).toBeDefined()
            const option=event.options.find(
                (item:{affordable:boolean})=>item.affordable
            )??event.options.find(
                (item:{immediateCost:string,feeOrDebt:string})=>
                    Number(item.immediateCost)+Number(item.feeOrDebt)===0
            )
            expect(option).toBeDefined()
            const resolved=await api
                .post(`/api/v1/simulations/${session.id}/events/${event.id}/resolve`)
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({optionId:option.id})
                .expect(201)
            expect(resolved.body.data.session.pending.type).toBe('EVENT_RESULT')
            const persisted=await e2e.prisma.simulationEvent.findUnique({
                where:{id:event.id}
            })
            expect(persisted?.status).toBe('RESOLVED')
            expect(persisted?.selectedOptionId).toBe(option.id)
        }finally{
            await e2e.close()
        }
    })
    it('completes the simulated month and returns the final results',async()=>{
        const e2e=await createApiE2eFixture()
        try{
            const {api,token}=await e2e.user()
            const created=await api
                .post('/api/v1/simulations')
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({timedMode:false})
                .expect(201)
            const session=created.body.data
            await api
                .post(`/api/v1/simulations/${session.id}/setup`)
                .set('Authorization',`Bearer ${token}`)
                .set('Idempotency-Key',randomUUID())
                .send({allocationId:session.briefing.allocationOptions[0].id})
                .expect(201)
            let detail
            for(let step=0;step<100;step++){
                const response=await api
                    .get(`/api/v1/simulations/${session.id}`)
                    .set('Authorization',`Bearer ${token}`)
                    .expect(200)
                detail=response.body.data
                if(detail.session.status==='COMPLETED'){
                    break
                }
                if(detail.currentEvent){
                    const option=detail.currentEvent.options.find(
                        (item:{immediateCost:string,feeOrDebt:string})=>
                            Number(item.immediateCost)+Number(item.feeOrDebt)===0
                    )
                    expect(option).toBeDefined()
                    await api
                        .post(`/api/v1/simulations/${session.id}/events/${detail.currentEvent.id}/resolve`)
                        .set('Authorization',`Bearer ${token}`)
                        .set('Idempotency-Key',randomUUID())
                        .send({optionId:option.id})
                        .expect(201)
                    continue
                }
                if(detail.session.pending.type!=='NONE'){
                    await api
                        .post(`/api/v1/simulations/${session.id}/continue`)
                        .set('Authorization',`Bearer ${token}`)
                        .set('Idempotency-Key',randomUUID())
                        .expect(201)
                    continue
                }
                await api
                    .post(`/api/v1/simulations/${session.id}/advance`)
                    .set('Authorization',`Bearer ${token}`)
                    .set('Idempotency-Key',randomUUID())
                    .expect(201)
            }
            expect(detail.session.status).toBe('COMPLETED')
            expect(detail.session.currentDay).toBe(30)
            expect(detail.session.completedAt).not.toBeNull()
            expect(detail.completion).not.toBeNull()
            expect(detail.scoreLedger).toBeDefined()
            const persisted=await e2e.prisma.simulationSession.findUnique({
                where:{id:session.id}
            })
            expect(persisted?.status).toBe('COMPLETED')
            expect(persisted?.completionSnapshot).not.toBeNull()
        }finally{
            await e2e.close()
        }
    })
})
