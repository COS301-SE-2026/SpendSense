import {Link} from "react-router-dom"
import {LongButton} from "@/components/common/LongButton"

export default function QuizPage() {
    return (
        <div className ="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4FBF7] px-6 text-center">
            <h1 className = "text-2xl font entrabold text-[#091828]">Financial Quiz</h1>
            <p className = "max-w-xs text-sm text-[#6b6375]">Test your money smarts and earn coins!</p>
            <LongButton LongVariant = "outline" LongSize ="md" showArrow={false} asChild>
                <Link to="/quests">Back to Quests</Link>
            </LongButton>
            </div>
    )
}