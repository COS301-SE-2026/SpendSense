import * as React from "react"
import {cn,iconButtonVariants} from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {ArrowLeft,RefreshCw,X,Edit2,Bell} from "lucide-react"

type IconButtonVariants="iconBack"|"iconRefresh"|"iconEdit"|"iconCancel"|"iconNotif"
type IconButtonProps=Omit<React.ComponentProps<typeof Button>,"variant">&{
    IconVariant?: IconButtonVariants
}

export function IconButton({
    IconVariant="iconBack",
    className,
    ...props
}:IconButtonProps){
    const iconMap: Record<string,React.ReactNode>={
        iconBack:<ArrowLeft className="h-5 w-5"/>,
        iconRefresh: <RefreshCw className="h-5 w-5"/>,
        iconEdit: <Edit2 className="h-5 w-5"/>,
        iconCancel:<X  className="h-5 w-5"/>,
        iconNotif:<Bell className="h-5 w-5"/>
    }
    return(
        <Button 
            variant="default"
            size="icon"
            className={cn(
                iconButtonVariants({variant:IconVariant}),className
            )}{...props}
        >
            {iconMap[IconVariant]}
        </Button>
    )
}