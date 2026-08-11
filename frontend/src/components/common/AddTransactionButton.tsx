import { useState,useEffect,useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react'; // Assumes you are using lucide-react for the Plus icon

export function AddTransactionButton() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef=useRef<HTMLDivElement>(null);
    useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [isOpen])
    return (
        <div className="relative inline-block">
        <button
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-haspopup="true"
            aria-label="Add transaction options"
            className="flex size-14 -translate-y-1 items-center justify-center rounded-full bg-[#0a1929] text-white shadow-lg ring-4 ring-white transition-transform hover:scale-105 active:scale-95 dark:bg-[#ffb1c5] dark:text-[#650030] dark:ring-[#0b1326]"
        >
            <Plus className={`size-6 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} />
        </button>
        {isOpen && (
            <>
            <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsOpen(false)} 
            />
            <div className="absolute bottom-16 left-1/2 z-50 w-40 -translate-x-1/2 rounded-xl bg-transparent animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex flex-col gap-1">
                    <Link
                        to="/paymentForm"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium bg-[#E0B0FF] border border-[#0a1929] shadow-[3px_4px_0_#0a1929] text-[#6E0034] hover:bg[#FCE0E8] transition-colors"
                    >
                        Payment
                    </Link>
                    
                    <Link
                        to="/obligationForm"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium bg-[#f2bf3c] border border-[#0a1929] shadow-[3px_4px_0_#0a1929] text-[#0a1929] hover:bg[#FCE0E8] transition-colors"
                    >
                        Obligation
                    </Link>
                </div>
            </div>
            </>
        )}
        </div>
    );
}