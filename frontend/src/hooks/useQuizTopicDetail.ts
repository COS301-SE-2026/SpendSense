import{useCallback,useEffect,useRef,useState} from 'react'
import{getQuizTopic} from '../features/quiz/quizApi'
import type{QuizTopic,QuizTopicDetail} from '../features/quiz/quizTypes'

function getErrorMessage(error:unknown){
	if(error instanceof Error){
		return error.message
	}
	return 'Failed to load this topic.'
}

function isAbortError(error:unknown){
	return error instanceof Error && error.name==='AbortError'
}

//Fetches GET /quiz/topics/:topic => Does NOT create a session
export function useQuizTopicDetail(topic:QuizTopic | null){
	const [detail,setDetail]=useState<QuizTopicDetail | null>(null)
	const [isLoading,setIsLoading]=useState(true)
	const [error,setError]=useState<string | null>(null)
	const requestId=useRef(0)
	const load=useCallback(
		async (signal?:AbortSignal)=>{
			if(!topic){
				setDetail(null)
				setIsLoading(false)
				setError(null)
				return
			}
			const id=requestId.current + 1
			requestId.current=id
			setIsLoading(true)
			setError(null)
			try{
				const loaded=await getQuizTopic(topic,{signal})
				if(id !== requestId.current){
					return
				}
				setDetail(loaded)
			} catch (err){
				if(isAbortError(err)){
					return
				}
				if(id===requestId.current){
					setError(getErrorMessage(err))
				}
			} finally{
				if(id===requestId.current){
					setIsLoading(false)
				}
			}
		},
		[topic]
	)
	useEffect(()=>{
		const controller=new AbortController()
		load(controller.signal)
		return ()=>{
			controller.abort()
		}
	},[load])
	return{detail,isLoading,error,reload:()=>load()}
}