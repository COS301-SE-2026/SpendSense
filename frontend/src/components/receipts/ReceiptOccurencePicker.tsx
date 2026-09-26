import { useEffect, useState } from 'react'
import { CalendarDays, Check, ChevronDown, RefreshCw, Wallet } from 'lucide-react'
import { getEligibleReceiptOccurrences, getReceiptOccurrenceBalance, type ReceiptOccurrence } from '../../features/receipts/receiptOccurrencesApi'

type ReceiptOccurrencePickerProps = Readonly<{
    preselectedOccurrenceId?: string | null
    selectedOccurrence: ReceiptOccurrence | null
    onSelect: (occurrence: ReceiptOccurrence | null) => void
    onCreateObligation: () => void
}>

function formatMoney(value: string, currency: string) {
    return `${currency} ${value}`
}

function formatDate(value: string) {
    const [year, month, day] = value.slice(0, 10).split('-')
    if (!year || !month || !day) return value
    return `${day}/${month}/${year}`
}

function isOverdue(value: string) {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return value.slice(0, 10) < `${year}-${month}-${day}`
}

export default function ReceiptOccurrencePicker({
    preselectedOccurrenceId,
    selectedOccurrence,
    onSelect,
    onCreateObligation,
}: ReceiptOccurrencePickerProps) {
    const [occurrences, setOccurrences] = useState<ReceiptOccurrence[]>([])
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [loadingBalance, setLoadingBalance] = useState(Boolean(preselectedOccurrenceId))
    const [error, setError] = useState<string | null>(null)
    const [balanceError, setBalanceError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [retryCount, setRetryCount] = useState(0)

    useEffect(() => {
        let active = true
        getEligibleReceiptOccurrences().then(result => {
            if (!active) return
            setOccurrences(result.items)
            setNextCursor(result.nextCursor)
            setError(null)
        }).catch(() => {
            if (!active) return
            setError('Unable to load available payments. Please try again.')
        }).finally(() => {
            if (active) setLoading(false)
        })
        return () => { active = false }
    }, [retryCount])
    useEffect(() => {
        if (!preselectedOccurrenceId) return
        let active = true
        getReceiptOccurrenceBalance(preselectedOccurrenceId).then(result => {
            if (!active) return
            onSelect(result.occurrence)
            setBalanceError(null)
        }).catch(() => {
            if (!active) return
            onSelect(null)
            setBalanceError('The preselected payment could not be loaded. Please choose another payment.')
        }).finally(() => {
            if (active) setLoadingBalance(false)
        })
        return () => { active = false }
    }, [preselectedOccurrenceId, onSelect])

    async function loadMore() {
        if (!nextCursor || loadingMore) return
        setLoadingMore(true)
        try {
            const result = await getEligibleReceiptOccurrences(nextCursor)
            setOccurrences(current => {
                const existing = new Set(current.map(item => item.id))
                return [...current, ...result.items.filter(item => !existing.has(item.id))]
            })
            setNextCursor(result.nextCursor)
            setError(null)
        } catch {
            setError('Unable to load more payments. Please try again.')
        } finally {
            setLoadingMore(false)
        }
    }
    async function selectOccurrence(occurrence: ReceiptOccurrence) {
        setIsOpen(false)
        setLoadingBalance(true)
        setBalanceError(null)
        onSelect(null)
        try {
            const result = await getReceiptOccurrenceBalance(occurrence.id)
            onSelect(result.occurrence)
        } catch {
            setBalanceError('Unable to load the current balance. Please try selecting the payment again.')
        } finally {
            setLoadingBalance(false)
        }
    }
    async function refreshBalance() {
        if (!selectedOccurrence || loadingBalance) return
        setLoadingBalance(true)
        setBalanceError(null)
        try {
            const result = await getReceiptOccurrenceBalance(selectedOccurrence.id)
            onSelect(result.occurrence)
        } catch {
            setBalanceError('Unable to refresh the balance. Please try again.')
        } finally {
            setLoadingBalance(false)
        }
    }

    function retryLoading() {
        setLoading(true)
        setError(null)
        setRetryCount(current => current + 1)
    }

    const canRecord = selectedOccurrence?.canRecord ?? (
        selectedOccurrence !== null &&
        selectedOccurrence.status !== 'PAID' &&
        selectedOccurrence.status !== 'PAID_LATE' &&
        selectedOccurrence.status !== 'MISSED' &&
        selectedOccurrence.status !== 'CANCELLED' &&
        Number(selectedOccurrence.amountRemaining) > 0
    )
    return (
        <section className="rounded-3xl border-2 border-[#091828] bg-white p-5 shadow-[5px_5px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[5px_5px_0_#060e20] sm:p-6">
            <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8E4F4] dark:bg-[#302A43]">
                    <Wallet className="size-6 text-[#5B4D8B] dark:text-[#c5b3f0]" />
                </div>
                <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-[#AC2A5D] dark:text-[#ffb1c5]">
                        Payment allocation
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">
                        Choose a payment
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#6b6375] dark:text-[#a0aec0]">
                        Select the scheduled payment that this receipt belongs to.
                    </p>
                </div>
            </div>
            <div className="mt-6">
                <span className="mb-2 block text-xs font-bold">
                    Allocate receipt to
                </span>
                <button
                    type="button"
                    aria-label="Select payment occurrence"
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen(current => !current)}
                    className="flex w-full items-center gap-3 rounded-2xl border-2 border-[#091828] bg-[#F4FBF7] px-4 py-4 text-left dark:border-white dark:bg-[#1c263c]"
                >
                    <CalendarDays className="size-5 shrink-0 text-[#10775F] dark:text-[#5eead4]" />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">
                        {selectedOccurrence ? selectedOccurrence.obligationName : 'Choose a payment occurrence'}
                    </span>
                    <ChevronDown className={`size-5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* ////////////////////////////// OPTION 1 ///////////////////////////////////////////////////// */}

                <div className="my-6 flex items-center gap-5">
                    <div className="h-px flex-1 bg-[#DCEFE8] dark:bg-[#2d3449]" />
                    <span className="px-2 text-xs font-bold uppercase tracking-widest text-[#6b6375] dark:text-[#a0aec0]">
                        or
                    </span>
                    <div className="h-px flex-1 bg-[#DCEFE8] dark:bg-[#2d3449]" />
                </div>

                <button
                    type="button"
                    onClick={onCreateObligation}
                    className="flex w-full items-center gap-3 rounded-2xl border-2 border-[#091828] bg-[#F4FBF7] px-4 py-4 text-left transition-all                             hover:bg-[#E1F0E9] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-[#060e20] dark:bg-[#1c263c] dark:shadow-[4px_4px_0_#060e20] dark:hover:bg-[#263D3A]"
                >
                    <span className="flex size-5 shrink-0 items-center justify-center text-xl font-black text-[#10775F] dark:text-[#5eead4]">
                        +
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-bold">
                        Create new payment occurrence
                    </span>
                </button>
                {/* //////////////////////////////////////////////////////////////////////////////////////////////// */}


                {isOpen && (
                    <div className="mt-3 rounded-2xl border-2 border-[#091828] bg-[#F4FBF7] p-3 dark:border-white dark:bg-[#1c263c]">

                        {/* ////////////////////////////// OPTION 2 ///////////////////////////////////////////////////// */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false)
                                onCreateObligation()
                            }}
                            className="
                            flex w-full items-center gap-3
                            rounded-2xl
                            border-2 border-[#091828]
                            bg-[#F4FBF7]
                            px-4 py-4
                            text-left
                            shadow-[4px_4px_0_#091828]
                            transition
                            hover:bg-[#E1F0E9]
                            active:translate-x-[2px]
                            active:translate-y-[2px]
                            active:shadow-none
                            dark:border-[#060e20]
                            dark:bg-[#1c263c]
                            dark:shadow-[4px_4px_0_#060e20]
                            dark:hover:bg-[#263D3A]
                            "

                        >
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#10775F] text-xl font-black text-white dark:bg-[#5eead4] dark:text-[#091828]">
                                +
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-extrabold">
                                    Create new payment occurrence
                                </p>

                                <p className="mt-1 text-xs font-semibold text-[#10775F] dark:text-[#5eead4]">
                                    This receipt isn't linked to an existing payment
                                </p>
                            </div>
                        </button>
                        {/* //////////////////////////////////////////////////////////////////////////////////////////////// */}

                        {loading && (
                            <output className="block px-2 py-3 text-sm font-medium">
                                Loading available payments...
                            </output>
                        )}
                        {error && (
                            <div className="space-y-3">
                                <p role="alert" className="text-sm font-semibold text-[#AC2A5D] dark:text-[#ffb1c5]">
                                    {error}
                                </p>
                                <button
                                    type="button"
                                    onClick={retryLoading}
                                    className="rounded-full bg-[#FFD9E1] px-4 py-2 text-xs font-bold text-[#AC2A5D] dark:bg-[#4B2635] dark:text-[#ffb1c5]"
                                >
                                    Retry payments
                                </button>
                            </div>
                        )}
                        {!loading && occurrences.length === 0 && !error && (
                            <p className="px-2 py-3 text-sm text-[#6b6375] dark:text-[#a0aec0]">
                                No eligible payments are available.
                            </p>
                        )}
                        {!loading && occurrences.map(occurrence => (
                            <button
                                key={occurrence.id}
                                type="button"
                                aria-label={`Select ${occurrence.obligationName} due ${occurrence.dueDate}`}
                                onClick={() => selectOccurrence(occurrence)}
                                className="mb-2 flex w-full items-center gap-3 rounded-xl bg-white px-3 py-3 text-left last:mb-0 dark:bg-[#131b2e]"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-extrabold">
                                        {occurrence.obligationName}
                                    </p>
                                    <p className={`mt-1 text-xs font-semibold ${isOverdue(occurrence.dueDate) ? 'text-[#AC2A5D] dark:text-[#ffb1c5]' : 'text-[#10775F] dark:text-[#5eead4]'}`}>
                                        Due {formatDate(occurrence.dueDate)}
                                    </p>
                                    <p className="mt-1 text-xs font-bold text-[#10775F] dark:text-[#5eead4]">
                                        Remaining {formatMoney(occurrence.amountRemaining, occurrence.currency)}
                                    </p>
                                </div>
                                {selectedOccurrence?.id === occurrence.id && (
                                    <Check className="size-5 shrink-0 text-[#10775F] dark:text-[#5eead4]" />
                                )}
                            </button>
                        ))}
                        {nextCursor && (
                            <button
                                type="button"
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="mt-2 w-full rounded-full bg-[#DCEFE8] px-4 py-3 text-xs font-bold text-[#10775F] disabled:opacity-50 dark:bg-[#0f4f42] dark:text-[#5eead4]"
                            >
                                {loadingMore ? 'Loading more...' : 'Load more payments'}
                            </button>
                        )}
                    </div>
                )}
            </div>
            {loadingBalance && (
                <output className="mt-4 block text-sm font-semibold text-[#6b6375] dark:text-[#a0aec0]">
                    Loading current balance...
                </output>
            )}
            {balanceError && (
                <p role="alert" className="mt-4 rounded-2xl bg-[#FFD9E1] px-4 py-3 text-sm font-semibold text-[#AC2A5D] dark:bg-[#4B2635] dark:text-[#ffb1c5]">
                    {balanceError}
                </p>
            )}
            {selectedOccurrence && !loadingBalance && (
                <div className="mt-6 rounded-2xl bg-[#DCEFE8] p-4 dark:bg-[#0f4f42]">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-[#10775F] dark:text-[#5eead4]">
                                Selected payment
                            </p>
                            <h3 className="mt-1 text-lg font-black">
                                {selectedOccurrence.obligationName}
                            </h3>
                            <p className={`mt-1 text-xs font-semibold ${isOverdue(selectedOccurrence.dueDate) ? 'text-[#AC2A5D] dark:text-[#ffb1c5]' : 'text-[#10775F] dark:text-[#5eead4]'}`}>
                                Due {formatDate(selectedOccurrence.dueDate)}
                            </p>
                        </div>
                        <button
                            type="button"
                            aria-label="Refresh occurrence balance"
                            onClick={refreshBalance}
                            disabled={loadingBalance}
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#10775F] disabled:opacity-50 dark:bg-[#1c263c] dark:text-[#5eead4]"
                        >
                            <RefreshCw className="size-5" />
                        </button>
                    </div>
                    <div className="mt-5 space-y-3 rounded-xl bg-white p-4 dark:bg-[#1c263c]">
                        <div className="flex justify-between gap-3 text-sm">
                            <span className="text-[#6b6375] dark:text-[#a0aec0]">Amount due</span>
                            <span className="font-bold">{formatMoney(selectedOccurrence.amountDue, selectedOccurrence.currency)}</span>
                        </div>
                        <div className="flex justify-between gap-3 text-sm">
                            <span className="text-[#6b6375] dark:text-[#a0aec0]">Already paid</span>
                            <span className="font-bold">{formatMoney(selectedOccurrence.amountPaid, selectedOccurrence.currency)}</span>
                        </div>
                        <div className="border-t border-[#DCEFE8] pt-3 dark:border-[#2d3449]">
                            <div className="flex justify-between gap-3">
                                <span className="text-sm font-extrabold">Remaining</span>
                                <span className="text-lg font-black text-[#10775F] dark:text-[#5eead4]">
                                    {formatMoney(selectedOccurrence.amountRemaining, selectedOccurrence.currency)}
                                </span>
                            </div>
                        </div>
                    </div>
                    {!canRecord && (
                        <p role="alert" className="mt-4 rounded-xl bg-[#FFD9E1] px-4 py-3 text-sm font-semibold text-[#AC2A5D] dark:bg-[#4B2635] dark:text-[#ffb1c5]">
                            This payment can no longer accept contributions. Please choose another occurrence.
                        </p>
                    )}
                </div>
            )}
            <p className="mt-5 text-xs leading-5 text-[#6b6375] dark:text-[#a0aec0]">
                The balance is retrieved from SpendSense. Selecting an occurrence does not record a payment.
            </p>
        </section>
    )
}