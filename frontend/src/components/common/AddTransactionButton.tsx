import { useState,useEffect,useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus,CreditCard,Camera,ClipboardPlus } from 'lucide-react';
import { AnimatePresence,motion } from 'framer-motion';

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
        <div ref={menuRef} className="relative inline-block">
        <AnimatePresence>
            {isOpen && (
                <>
                <motion.div
                    initial={{opacity:0}}
                    animate={{opacity:1}}
                    exit={{opacity:0}}
                    transition={{duration:0.2}}
                    className="fixed inset-0 z-40 backdrop-blur-[1px]"
                    onClick={() => setIsOpen(false)}
                />
                <div className="pointer-events-none absolute bottom-12 left-1/2 z-50 h-60 w-[420px] -translate-x-1/2">
                    <motion.div
                        initial={{
                            opacity:0,
                            x:0,
                            y:90,
                            scale:0.25,
                            rotate:20,
                        }}
                        animate={{
                            opacity:1,
                            x:-138,
                            y:-20,
                            scale:1,
                            rotate:-4,
                        }}
                        exit={{
                            opacity:0,
                            x:0,
                            y:90,
                            scale:0.25,
                            rotate:20,
                        }}
                        transition={{
                            type:"spring",
                            stiffness:330,
                            damping:18,
                            delay:0.02,
                        }}
                        className="pointer-events-auto absolute bottom-0 left-1/2"
                    >
                        <Link
                            to="/paymentForm"
                            onClick={() => setIsOpen(false)}
                            className="flex flex-col items-center gap-3"
                        >
                            <motion.div
                                animate={{
                                    y:[0,-3,0],
                                    rotate:[-4,-1,-4],
                                }}
                                transition={{
                                    duration:2.8,
                                    repeat:Infinity,
                                    ease:"easeInOut",
                                }}
                                whileHover={{
                                    scale:1.1,
                                    rotate:3,
                                }}
                                whileTap={{
                                    scale:0.9,
                                }}
                                className="flex size-14 items-center justify-center rounded-full border-2 border-[#091828] bg-[#E8E4F4] text-[#5B4D8B] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#28223f] dark:text-[#c5b3f0] dark:shadow-[4px_4px_0_#060e20]"
                            >
                                <CreditCard className="size-6"/>
                            </motion.div>
                            <motion.span
                                initial={{opacity:0,y:6}}
                                animate={{opacity:1,y:0}}
                                exit={{opacity:0,y:6}}
                                transition={{delay:0.18,duration:0.2}}
                                className="rounded-full border-2 border-[#091828] bg-white px-3 py-1 text-[11px] font-extrabold text-[#091828] shadow-[2px_2px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:text-white dark:shadow-[2px_2px_0_#060e20]"
                            >
                                Payment
                            </motion.span>
                        </Link>
                    </motion.div>
                    <motion.div
                        initial={{
                            opacity:0,
                            x:0,
                            y:100,
                            scale:0.2,
                        }}
                        animate={{
                            opacity:1,
                            x:0,
                            y:-132,
                            scale:1,
                        }}
                        exit={{
                            opacity:0,
                            x:0,
                            y:100,
                            scale:0.2,
                        }}
                        transition={{
                            type:"spring",
                            stiffness:340,
                            damping:17,
                            delay:0.07,
                        }}
                        className="pointer-events-auto absolute bottom-0 left-1/2 -translate-x-1/2"
                    >
                        <Link
                            to="/receipts/new"
                            onClick={() => setIsOpen(false)}
                            className="flex flex-col items-center gap-3"
                        >
                            <motion.div
                                animate={{
                                    y:[0,-5,0],
                                    rotate:[0,2,0,-2,0],
                                }}
                                transition={{
                                    y:{
                                        duration:2.2,
                                        repeat:Infinity,
                                        ease:"easeInOut",
                                    },
                                    rotate:{
                                        duration:4,
                                        repeat:Infinity,
                                        ease:"easeInOut",
                                    },
                                }}
                                whileHover={{
                                    scale:1.12,
                                }}
                                whileTap={{
                                    scale:0.9,
                                }}
                                className="relative flex size-[68px] items-center justify-center rounded-full border-2 border-[#091828] bg-[#DCEFE8] text-[#0E7A5F] shadow-[5px_5px_0_#091828] dark:border-[#060e20] dark:bg-[#0f4f42] dark:text-[#5eead4] dark:shadow-[5px_5px_0_#060e20]"
                            >
                                <motion.div
                                    initial={{scale:0.5,opacity:0}}
                                    animate={{scale:[0.8,1.35],opacity:[0.5,0]}}
                                    transition={{
                                        duration:1.4,
                                        repeat:Infinity,
                                        ease:"easeOut",
                                    }}
                                    className="absolute inset-0 rounded-full border-2 border-[#6FC9B0]"
                                />
                                <Camera className="relative z-10 size-7"/>
                            </motion.div>
                            <motion.div
                                initial={{opacity:0,y:8}}
                                animate={{opacity:1,y:0}}
                                exit={{opacity:0,y:8}}
                                transition={{delay:0.23,duration:0.2}}
                                className="flex flex-col items-center"
                            >
                                <span className="rounded-full border-2 border-[#091828] bg-white px-3 py-1 text-[11px] font-extrabold text-[#091828] shadow-[2px_2px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:text-white dark:shadow-[2px_2px_0_#060e20]">
                                    Scan receipt
                                </span>
                            </motion.div>
                        </Link>
                    </motion.div>
                    <motion.div
                        initial={{
                            opacity:0,
                            x:0,
                            y:90,
                            scale:0.25,
                            rotate:-20,
                        }}
                        animate={{
                            opacity:1,
                            x:138,
                            y:-20,
                            scale:1,
                            rotate:4,
                        }}
                        exit={{
                            opacity:0,
                            x:0,
                            y:90,
                            scale:0.25,
                            rotate:-20,
                        }}
                        transition={{
                            type:"spring",
                            stiffness:330,
                            damping:18,
                            delay:0.04,
                        }}
                        className="pointer-events-auto absolute bottom-0 left-1/2 -translate-x-full"
                    >
                        <Link
                            to="/obligationForm"
                            onClick={() => setIsOpen(false)}
                            className="flex flex-col items-center gap-3"
                        >
                            <motion.div
                                animate={{
                                    y:[0,-3,0],
                                    rotate:[4,1,4],
                                }}
                                transition={{
                                    duration:3.1,
                                    repeat:Infinity,
                                    ease:"easeInOut",
                                }}
                                whileHover={{
                                    scale:1.1,
                                    rotate:-3,
                                }}
                                whileTap={{
                                    scale:0.9,
                                }}
                                className="flex size-14 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FFE9B5] text-[#7A5A00] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#3a3118] dark:text-[#ffd166] dark:shadow-[4px_4px_0_#060e20]"
                            >
                                <ClipboardPlus className="size-6"/>
                            </motion.div>

                            <motion.span
                                initial={{opacity:0,y:6}}
                                animate={{opacity:1,y:0}}
                                exit={{opacity:0,y:6}}
                                transition={{delay:0.2,duration:0.2}}
                                className="rounded-full border-2 border-[#091828] bg-white px-3 py-1 text-[11px] font-extrabold text-[#091828] shadow-[2px_2px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:text-white dark:shadow-[2px_2px_0_#060e20]"
                            >
                                Obligation
                            </motion.span>
                        </Link>
                    </motion.div>

                </div>
                </>
            )}
        </AnimatePresence>
        <motion.div
            className="relative z-50"
            animate={isOpen?{
                scale:[1,0.86,1.08,1],
            }:{
                scale:1,
            }}
            transition={{
                duration:0.4,
                ease:[0.22,1,0.36,1],
            }}
        >
            <motion.button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label="Add transaction options"
                whileHover={{scale:1.06}}
                whileTap={{scale:0.88}}
                className="relative flex size-16 -translate-y-2 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FFD9E1] text-[#091828] shadow-[5px_5px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:text-[#650030] dark:shadow-[5px_5px_0_#060e20]"
            >
                <AnimatePresence>
                    {isOpen && (
                        <motion.span
                            initial={{
                                scale:0.3,
                                opacity:0.7,
                            }}
                            animate={{
                                scale:1.8,
                                opacity:0,
                            }}
                            exit={{opacity:0}}
                            transition={{
                                duration:0.6,
                                ease:"easeOut",
                            }}
                            className="absolute inset-0 rounded-full border-2 border-[#FF6B9D]"
                        />
                    )}
                </AnimatePresence>
                <motion.div
                    animate={{
                        rotate:isOpen?45:0,
                    }}
                    transition={{
                        type:"spring",
                        stiffness:400,
                        damping:18,
                    }}
                >
                    <Plus className="size-7"/>
                </motion.div>
            </motion.button>
        </motion.div>
        </div>
    );
}