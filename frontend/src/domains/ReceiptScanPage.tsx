
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { scanReceipt, type ReceiptScan } from '../features/receipts/receiptsApi'
import { SubPageShell } from '@/components/common/SubPageShell'
import { LongButton } from '@/components/common/LongButton'
import { CustomCard } from '@/components/ui/CustomCard'
import { FileText } from 'lucide-react'

const scanErrorMessages: Record<string, string> = {
    UNSUPPORTED_RECEIPT: 'Please upload a JPEG or PNG receipt.',
    RECEIPT_TOO_LARGE: 'Your receipt is too large. Maximum 8 MiB.',
    OCR_NO_USABLE_RESULT: "We couldn't read this receipt. Try another photo or enter the payment manually.",
    OCR_BUSY: 'Receipt scanning is busy. Please try again.',
    OCR_UNAVAILABLE: 'Receipt scanning is temporarily unavailable.',
}

export default function ReceiptScanPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const occurrenceId = searchParams.get('occurrenceId') ?? undefined
    const uploadInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)
    const previewUrlRef = useRef<string | null>(null)
    const cameraStreamRef = useRef<MediaStream | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const [image, setImage] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [scan, setScan] = useState<ReceiptScan | null>(null)
    const [hasScanFailed, setHasScanFailed] = useState(false)
    const [isCameraOpen, setIsCameraOpen] = useState(false)
    const [isStartingCamera, setIsStartingCamera] = useState(false)

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
            cameraStreamRef.current?.getTracks().forEach(track => track.stop())
        }
    }, [])

    useEffect(() => {
        if (isCameraOpen && videoRef.current) videoRef.current.srcObject = cameraStreamRef.current
    }, [isCameraOpen])

    function closeCamera() {
        cameraStreamRef.current?.getTracks().forEach(track => track.stop())
        cameraStreamRef.current = null
        if (videoRef.current) videoRef.current.srcObject = null
        setIsCameraOpen(false)
    }

    async function openCamera() {
        if (isScanning || isStartingCamera) return
        if (!navigator.mediaDevices?.getUserMedia) {
            cameraInputRef.current?.click()
            return
        }
        setIsStartingCamera(true)
        setError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
            cameraStreamRef.current = stream
            setIsCameraOpen(true)
        } catch (error) {
            const denied = (error as { name?: string })?.name === 'NotAllowedError' || (error as { name?: string })?.name === 'PermissionDeniedError'
            setError(denied ? 'Camera access was denied. You can still upload an image.' : 'Unable to access your camera. You can still upload an image.')
        } finally {
            setIsStartingCamera(false)
        }
    }

    async function capturePhoto() {
        const video = videoRef.current
        if (!video?.videoWidth || !video.videoHeight) {
            setError('Camera is not ready. Please try again or upload an image.')
            return
        }
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const context = canvas.getContext('2d')
        if (!context) {
            setError('Unable to capture a photo. Please upload an image.')
            return
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
        if (!blob) {
            setError('Unable to capture a photo. Please upload an image.')
            return
        }
        selectImage(new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' }))
        closeCamera()
    }

    function selectImage(file: File | undefined) {
        if (!file || isScanning) return
        if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
            setError('Please choose a JPEG or PNG image.')
            setHasScanFailed(true)
            setScan(null)
            return
        }
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        const url = URL.createObjectURL(file)
        previewUrlRef.current = url
        setPreviewUrl(url)
        setImage(file)
        setError(null)
        setScan(null)
        setHasScanFailed(false)
    }

    function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
        if (isCameraOpen) closeCamera()
        selectImage(event.target.files?.[0])
        event.target.value = ''
    }

    function removeImage() {
        if (isScanning) return
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
        setPreviewUrl(null)
        setImage(null)
        setError(null)
        setScan(null)
        setHasScanFailed(false)
    }

    async function handleScan() {
        if (!image || isScanning) return
        setIsScanning(true)
        setError(null)
        setScan(null)
        setHasScanFailed(false)
        try {
            const result = await scanReceipt(image, occurrenceId)
            setScan(result)
            navigate(`/receipts/scans/${encodeURIComponent(result.id)}/review`, { state: { scan: result } })
        } catch (error) {
            const code = (error as { error?: { code?: string } })?.error?.code
            setError(scanErrorMessages[code ?? ''] ?? 'Unable to scan receipt. Please try again.')
            setHasScanFailed(true)
        } finally {
            setIsScanning(false)
        }
    }

    return (
        <SubPageShell title="Receipt scan">
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
            <CustomCard variant="navyShaddow" size="md" className="relative overflow-hidden rounded-3xl border-2 border-[#091828] p-5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:shadow-[4px_4px_0_#060e20]">
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#DCEFE8] dark:bg-[#284338]" />
                <div className="relative">
                    {isCameraOpen && (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted aria-label="Receipt camera preview" className="max-h-[420px] w-full rounded-[1.5rem] border-2 border-[#091828] bg-black object-contain dark:border-white" />
                            <div className="mt-5 flex flex-col gap-3">
                                <LongButton LongVariant="primaryPinkBorder" showArrow={false} type="button" onClick={capturePhoto}>
                                    Capture receipt
                                </LongButton>
                                <LongButton LongVariant="outline" showArrow={false} type="button" onClick={closeCamera}>
                                    Cancel camera
                                </LongButton>
                            </div>
                            <LongButton LongVariant="primaryYellow" showArrow={false} type="button" onClick={() => { closeCamera(); uploadInputRef.current?.click() }} className="mt-3">
                                Upload image instead
                            </LongButton>
                        </>
                    )}
                    {!isCameraOpen && previewUrl && (
                        <>
                            <div className="overflow-hidden rounded-[1.5rem] border-2 border-[#091828] bg-white shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#060e20]">
                                <img
                                    src={previewUrl}
                                    alt="Receipt preview"
                                    className="max-h-[420px] w-full object-contain"
                                />
                            </div>
                            <div className="mt-5 flex flex-col gap-3">
                                <LongButton LongVariant="primaryPinkBorder" showArrow={false}
                                    type="button"
                                    onClick={openCamera}
                                    disabled={isScanning || isStartingCamera}
                                >
                                    Retake photo
                                </LongButton>
                                <LongButton LongVariant="outline" showArrow={false}
                                    type="button"
                                    onClick={() => uploadInputRef.current?.click()}
                                    disabled={isScanning}
                                >
                                    Replace image
                                </LongButton>
                                <LongButton LongVariant="outline" showArrow={false}
                                    type="button"
                                    onClick={removeImage}
                                    disabled={isScanning}
                                >
                                    Remove image
                                </LongButton>
                                <LongButton LongVariant="primaryMint" showArrow={false}
                                    type="button"
                                    onClick={handleScan}
                                    disabled={isScanning || scan?.status === 'READY_FOR_REVIEW'}
                                >
                                    {isScanning ? 'Reading your receipt...' : 'Scan receipt'}
                                </LongButton>
                            </div>
                        </>
                    )}
                    {!isCameraOpen && !previewUrl && (
                        <>
                            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#091828] bg-[#FFE9B5] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#574821] dark:shadow-[4px_4px_0_#060e20]">
                                <FileText className="size-9 text-[#7A5A00] dark:text-[#ffd166]" />
                            </div>
                            <h2 className="text-2xl font-black tracking-[-0.03em]">
                                Add a receipt
                            </h2>
                            <p className="mt-2 max-w-sm text-sm font-medium leading-6 opacity-70">
                                JPEG and PNG images are supported. Make sure the receipt is clear and easy to read.
                            </p>
                            <div className="mt-7 flex flex-col gap-3">
                                <LongButton LongVariant="primaryPinkBorder" showArrow={false}
                                    type="button"
                                    onClick={openCamera}
                                    disabled={isStartingCamera}
                                >
                                    {isStartingCamera ? 'Opening camera...' : 'Take photo'}
                                </LongButton>
                                <LongButton LongVariant="outline" showArrow={false}
                                    type="button"
                                    onClick={() => uploadInputRef.current?.click()}
                                >
                                    Upload image
                                </LongButton>
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
                    {isScanning && (
                        <output className="mt-4 block text-center text-sm font-bold">
                            Reading your receipt...
                        </output>
                    )}
                    {scan?.status === 'READY_FOR_REVIEW' && (
                        <output className="mt-4 block rounded-2xl border-2 border-[#091828] bg-[#DCEFE8] px-4 py-3 text-sm font-bold shadow-[3px_3px_0_#091828] dark:border-[#060e20] dark:bg-[#0f4f42] dark:shadow-[3px_3px_0_#060e20]">
                            Receipt scanned. Ready for review.
                        </output>
                    )}
                    {error && (
                        <p role="alert" className="mt-4 rounded-2xl border-2 border-[#091828] bg-[#FFD9E1] px-4 py-3 text-sm font-bold shadow-[3px_3px_0_#091828] dark:border-[#060e20] dark:bg-[#4B2635] dark:shadow-[3px_3px_0_#060e20]">
                            {error}
                        </p>
                    )}
                    {hasScanFailed && (
                        <LongButton LongVariant="outline" showArrow={false}
                            type="button"
                            onClick={() => navigate(occurrenceId ? `/paymentForm?occurrenceId=${encodeURIComponent(occurrenceId)}` : '/paymentForm')}
                            className="mt-3"
                        >
                            Enter payment manually
                        </LongButton>
                    )}
                </div>
            </CustomCard>
            <section className="rounded-3xl border-2 border-[#091828] bg-[#E8E4F4] p-5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#302A43] dark:shadow-[4px_4px_0_#060e20]">
                <p className="text-xs font-black uppercase tracking-[0.18em]">
                    What happens next?
                </p>
                <p className="mt-2 text-sm font-medium leading-6 opacity-75">
                    You will preview the receipt first. Nothing will be logged until the image has been processed and the payment details are ready.
                </p>
            </section>
        </SubPageShell>
    )
}