
import React,{useEffect,useRef,useState} from 'react'
import {useNavigate,useSearchParams} from 'react-router-dom'
import {scanReceipt,type ReceiptScan} from '../features/receipts/receiptsApi'

export default function ReceiptScanPage(){
    const navigate=useNavigate()
    const [searchParams]=useSearchParams()
    const occurrenceId=searchParams.get('occurrenceId')??undefined
    const uploadInputRef=useRef<HTMLInputElement>(null)
    const cameraInputRef=useRef<HTMLInputElement>(null)
    const previewUrlRef=useRef<string|null>(null)
    const [image,setImage]=useState<File|null>(null)
    const [previewUrl,setPreviewUrl]=useState<string|null>(null)
    const [error,setError]=useState<string|null>(null)
    const [isScanning,setIsScanning]=useState(false)
    const [scan,setScan]=useState<ReceiptScan|null>(null)

    useEffect(()=>{
        return()=>{
            if(previewUrlRef.current)URL.revokeObjectURL(previewUrlRef.current)
        }
    },[])

    function selectImage(file:File|undefined){
        if(!file||isScanning)return
        if(file.type!=='image/jpeg'&&file.type!=='image/png'){
            setError('Please choose a JPEG or PNG image.')
            return
        }
        if(previewUrlRef.current)URL.revokeObjectURL(previewUrlRef.current)
        const url=URL.createObjectURL(file)
        previewUrlRef.current=url
        setPreviewUrl(url)
        setImage(file)
        setError(null)
        setScan(null)
    }

    function handleUpload(event:React.ChangeEvent<HTMLInputElement>){
        selectImage(event.target.files?.[0])
        event.target.value=''
    }

    function removeImage(){
        if(isScanning)return
        if(previewUrlRef.current)URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current=null
        setPreviewUrl(null)
        setImage(null)
        setError(null)
        setScan(null)
    }

    async function handleScan(){
        if(!image||isScanning)return
        setIsScanning(true)
        setError(null)
        setScan(null)
        try{
            const result=await scanReceipt(image,occurrenceId)
            setScan(result)
        }catch{
            setError('Unable to scan receipt. Please try again.')
        }finally{
            setIsScanning(false)
        }
    }

    return(
        <main className="min-h-[100dvh] bg-[#FFF8F3] px-5 py-8 text-[#091828] dark:bg-[#101820] dark:text-white">
            <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={()=>navigate(-1)}
                        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#091828] bg-white text-xl font-bold shadow-[4px_4px_0_#091828] transition active:translate-x-1 active:translate-y-1 active:shadow-none dark:border-white dark:bg-[#1B2631] dark:shadow-[4px_4px_0_#FFFFFF]"
                        aria-label="Go back"
                    >
                        ←
                    </button>
                    <span className="rounded-full border-2 border-[#091828] bg-[#FFD9E1] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] shadow-[3px_3px_0_#091828] dark:border-white dark:bg-[#4B2635] dark:shadow-[3px_3px_0_#FFFFFF]">
                        Receipt scan
                    </span>
                </div>
                <section>
                    <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[#FF6B9D]">
                        SpendSense
                    </p>
                    <h1 className="text-4xl font-black leading-none tracking-[-0.04em] sm:text-5xl">
                        Scan your receipt
                    </h1>
                    <p className="mt-4 max-w-md text-base font-medium leading-6 opacity-70">
                        Take a photo of your receipt or upload one you already have. We will use it to help log your payment.
                    </p>
                </section>
                <section className="relative overflow-hidden rounded-[2rem] border-2 border-[#091828] bg-[#F4FBF7] p-6 shadow-[7px_7px_0_#091828] dark:border-white dark:bg-[#182720] dark:shadow-[7px_7px_0_#FFFFFF]">
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#DCEFE8] dark:bg-[#284338]"/>
                    <div className="relative">
                        {previewUrl?(
                            <>
                                <div className="overflow-hidden rounded-[1.5rem] border-2 border-[#091828] bg-white shadow-[4px_4px_0_#091828] dark:border-white dark:bg-[#1B2631] dark:shadow-[4px_4px_0_#FFFFFF]">
                                    <img
                                        src={previewUrl}
                                        alt="Receipt preview"
                                        className="max-h-[420px] w-full object-contain"
                                    />
                                </div>
                                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={()=>cameraInputRef.current?.click()}
                                        disabled={isScanning}
                                        className="flex-1 rounded-full border-2 border-[#091828] bg-[#FFD9E1] px-5 py-3 font-black shadow-[4px_4px_0_#091828] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-[#4B2635] dark:shadow-[4px_4px_0_#FFFFFF]"
                                    >
                                        Retake photo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={()=>uploadInputRef.current?.click()}
                                        disabled={isScanning}
                                        className="flex-1 rounded-full border-2 border-[#091828] bg-white px-5 py-3 font-black shadow-[4px_4px_0_#091828] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-[#1B2631] dark:shadow-[4px_4px_0_#FFFFFF]"
                                    >
                                        Replace image
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    disabled={isScanning}
                                    className="mt-3 w-full rounded-full border-2 border-[#091828] bg-[#FFE9B5] px-5 py-3 font-black shadow-[4px_4px_0_#091828] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-[#574821] dark:shadow-[4px_4px_0_#FFFFFF]"
                                >
                                    Remove image
                                </button>
                                <button
                                    type="button"
                                    onClick={handleScan}
                                    disabled={isScanning||scan?.status==='READY_FOR_REVIEW'}
                                    className="mt-3 w-full rounded-full border-2 border-[#091828] bg-[#DCEFE8] px-5 py-4 font-black shadow-[4px_4px_0_#091828] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-[#0f4f42] dark:shadow-[4px_4px_0_#FFFFFF]"
                                >
                                    {isScanning?'Reading your receipt...':'Scan receipt'}
                                </button>
                            </>
                        ):(
                            <>
                                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border-2 border-[#091828] bg-[#FFE9B5] text-4xl shadow-[4px_4px_0_#091828] dark:border-white dark:bg-[#574821] dark:shadow-[4px_4px_0_#FFFFFF]">
                                    🧾
                                </div>
                                <h2 className="text-2xl font-black tracking-[-0.03em]">
                                    Add a receipt
                                </h2>
                                <p className="mt-2 max-w-sm text-sm font-medium leading-6 opacity-70">
                                    JPEG and PNG images are supported. Make sure the receipt is clear and easy to read.
                                </p>
                                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={()=>cameraInputRef.current?.click()}
                                        className="flex-1 rounded-full border-2 border-[#091828] bg-[#FFD9E1] px-5 py-3 font-black shadow-[4px_4px_0_#091828] transition active:translate-x-1 active:translate-y-1 active:shadow-none dark:border-white dark:bg-[#4B2635] dark:shadow-[4px_4px_0_#FFFFFF]"
                                    >
                                        Take photo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={()=>uploadInputRef.current?.click()}
                                        className="flex-1 rounded-full border-2 border-[#091828] bg-white px-5 py-3 font-black shadow-[4px_4px_0_#091828] transition active:translate-x-1 active:translate-y-1 active:shadow-none dark:border-white dark:bg-[#1B2631] dark:shadow-[4px_4px_0_#FFFFFF]"
                                    >
                                        Upload image
                                    </button>
                                </div>
                            </>
                        )}
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            capture="environment"
                            onChange={handleUpload}
                            disabled={isScanning}
                            className="hidden"
                            aria-label="Take receipt photo"
                        />
                        <input
                            ref={uploadInputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={handleUpload}
                            disabled={isScanning}
                            className="hidden"
                            aria-label="Upload receipt image"
                        />
                        {isScanning&&(
                            <p role="status" className="mt-4 text-center text-sm font-bold">
                                Reading your receipt...
                            </p>
                        )}
                        {scan?.status==='READY_FOR_REVIEW'&&(
                            <p role="status" className="mt-4 rounded-2xl border-2 border-[#091828] bg-[#DCEFE8] px-4 py-3 text-sm font-bold shadow-[3px_3px_0_#091828] dark:border-white dark:bg-[#0f4f42] dark:shadow-[3px_3px_0_#FFFFFF]">
                                Receipt scanned. Ready for review.
                            </p>
                        )}
                        {error&&(
                            <p role="alert" className="mt-4 rounded-2xl border-2 border-[#091828] bg-[#FFD9E1] px-4 py-3 text-sm font-bold shadow-[3px_3px_0_#091828] dark:border-white dark:bg-[#4B2635] dark:shadow-[3px_3px_0_#FFFFFF]">
                                {error}
                            </p>
                        )}
                    </div>
                </section>
                <section className="rounded-[1.6rem] border-2 border-[#091828] bg-[#E8E4F4] p-5 shadow-[5px_5px_0_#091828] dark:border-white dark:bg-[#302A43] dark:shadow-[5px_5px_0_#FFFFFF]">
                    <p className="text-xs font-black uppercase tracking-[0.18em]">
                        What happens next?
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 opacity-75">
                        You will preview the receipt first. Nothing will be logged until the image has been processed and the payment details are ready.
                    </p>
                </section>
            </div>
        </main>
    )
}