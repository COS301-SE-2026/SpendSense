import * as React from "react";
import "@testing-library/jest-dom/vitest";
import {describe,it,expect,vi,beforeEach} from "vitest";
import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MemoryRouter,Route,Routes} from "react-router-dom";
import QuizPage from "../domains/QuizPage";
import {getDailyQuiz,getQuizTopic,getQuizTopics} from "../features/quiz/quizApi";
import {useQuizSession} from "../hooks/useQuizSession";
import type {DailyQuizAvailable,DailyQuizCompleted,DailyQuizInProgress,QuizTopicDetail,QuizTopicSummary} from "../features/quiz/quizTypes";

//mocked stuff
const mockNav=vi.fn();

vi.mock("react-router-dom",async()=>{
    const actual=await vi.importActual<typeof import("react-router-dom")>(
        "react-router-dom"
    );
    return{
        ...actual,
        useNavigate:()=>mockNav,
    };
});

vi.mock("../features/quiz/quizApi",()=>({
    getDailyQuiz:vi.fn(),
    getQuizTopic:vi.fn(),
    getQuizTopics:vi.fn(),
}));

vi.mock("../hooks/useQuizSession",()=>({
    useQuizSession:vi.fn(),
}));

vi.mock("@/components/common/LongButton",()=>({
    LongButton:({children,asChild,onClick,disabled}:{
        children:React.ReactNode;
        asChild?:boolean;
        onClick?:()=>void;
        disabled?:boolean;
    })=>{
        if(asChild){
            return <>{children}</>;
        }
        return(
            <button onClick={onClick} disabled={disabled}>
                {children}
            </button>
        );
    },
}));

const mockedGetDailyQuiz=vi.mocked(getDailyQuiz);
const mockedGetQuizTopic=vi.mocked(getQuizTopic);
const mockedUseQuizSession=vi.mocked(useQuizSession);
const mockedGetQuizTopics=vi.mocked(getQuizTopics);

//unmocked stuff
const AVAILABLE:DailyQuizAvailable={
    date:"2026-07-15",
    status:"AVAILABLE",
    session:null,
    rewardPreview:{xp:50,coins:25},
    knowledgeStreak:{current:3,longest:7},
};

const IN_PROGRESS:DailyQuizInProgress={
    date:"2026-07-15",
    status:"IN_PROGRESS",
    session:{
        id:"session-inProg",
        type:"DAILY",
        status:"IN_PROGRESS",
        progress:{
            correct:2,
            answeredAttempts:3,
            initialQuestions:5,
            remainingQueue:4,
        },
    },
    rewardPreview:{xp:50,coins:25},
};

const COMPLETED:DailyQuizCompleted={
    date:"2026-07-15",
    status:"COMPLETED",
    session:{
        id:"session-completed",
        type:"DAILY",
        status:"COMPLETED",
        score:5,
        totalQuestions:5,
        completedAt:"2026-07-13T08:12:00.000Z",
    },
    reward:{xp:50,coins:25},
};

const TOPIC:QuizTopicDetail={
    key:"BUDGETING",
    name:"Budgeting",
    description:"Learn how to plan and manage your spending.",
    teachingContent:{
        title:"Budgeting basics",
        body:"A budget helps you plan where your money goes.",
        keyPoints:[
            "Track income",
            "Plan expenses",
            "Review spending",
        ],
    },
    available:true,
    questionCount:6,
};

const UNAVAILABLE_TOPIC:QuizTopicDetail={
    key:"INTEREST",
    name:"Interest",
    description:"Learn how interest affects saving and borrowing.",
    teachingContent:{
        title:"Interest basics",
        body:"Interest affects both debt and savings.",
        keyPoints:[
            "Interest rates",
            "Saving",
            "Borrowing",
        ],
    },
    available:false,
    questionCount:5,
};

const TOPIC_SUMMARIES:QuizTopicSummary[]=[
    {
        key:"BUDGETING",
        name:"Budgeting",
        description:"Learn how to plan and manage your spending.",
        available:true,
        questionCount:6,
        rewardPreview:{
            xp:30,
            coins:15,
        },
    },
];

function buildUseQuizSession(overrides:Partial<ReturnType<typeof useQuizSession>>={}){
    return{
        session:null,
        currentQuestion:null,
        feedback:null,
        nextQuestion:null,
        result:null,
        isLoading:false,
        isSubmitting:false,
        error:null,
        startSession:vi.fn(),
        startDailyQuiz:vi.fn(),
        startTopicQuiz:vi.fn(),
        resumeSession:vi.fn(),
        answerQuestion:vi.fn(),
        continueToNextQuestion:vi.fn(),
        clearError:vi.fn(),
        resetSession:vi.fn(),
        cancelRequests:vi.fn(),
        ...overrides,
    };
}

function renderQuizPage(path="/quiz"){
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/quiz" element={<QuizPage/>}/>
                <Route path="/quiz/topics/:topic" element={<QuizPage/>}/>
            </Routes>
        </MemoryRouter>
    );
}

function deferred<T>(){
    let resolve!:(value:T)=>void;
    let reject!:(reason?:unknown)=>void;
    const promise=new Promise<T>((res,rej)=>{
        resolve=res;
        reject=rej;
    });
    return{promise,resolve,reject};
}

beforeEach(()=>{
    vi.clearAllMocks();
    mockedUseQuizSession.mockReturnValue(buildUseQuizSession());
    mockedGetQuizTopics.mockResolvedValue(TOPIC_SUMMARIES);
});

//loading state
describe("QuizPage - loading state",()=>{
    it("shows a loading message while the daily quiz is being fetched",()=>{
        const {promise}=deferred<DailyQuizAvailable>();
        mockedGetDailyQuiz.mockReturnValue(promise);
        renderQuizPage();
        expect(screen.getByText(/loading today's quiz/i)).toBeInTheDocument();
    });
    it("shows a loading message while a topic quiz is being fetched",()=>{
        const {promise}=deferred<QuizTopicDetail>();
        mockedGetQuizTopic.mockReturnValue(promise);
        renderQuizPage("/quiz/topics/BUDGETING");
        expect(screen.getByText(/loading topic quiz/i)).toBeInTheDocument();
    });
});

//error state
describe("QuizPage - error state",()=>{
    it("shows an error message with Retry and Back to Quests when the daily fetch fails",async()=>{
        mockedGetDailyQuiz.mockRejectedValueOnce(new Error("Network down"));
        renderQuizPage();
        expect(await screen.findByText(/network down/i)).toBeInTheDocument();
        expect(screen.getByRole("button",{name:/retry/i})).toBeInTheDocument();
        expect(screen.getByRole("link",{name:/back to quests/i})).toHaveAttribute("href","/quests");
    });
    it("refetches when Retry is clicked",async()=>{
        const user=userEvent.setup();
        mockedGetDailyQuiz.mockRejectedValueOnce(new Error("Network down"));
        mockedGetDailyQuiz.mockResolvedValueOnce(AVAILABLE);
        renderQuizPage();
        expect(await screen.findByText(/network down/i)).toBeInTheDocument();
        expect(mockedGetDailyQuiz).toHaveBeenCalledTimes(1);
        await user.click(screen.getByRole("button",{name:/retry/i}));
        expect(await screen.findByRole("button",{name:/start daily quiz/i})).toBeInTheDocument();
        expect(mockedGetDailyQuiz).toHaveBeenCalledTimes(2);
    });
    it("does not treat an aborted request as an error",async()=>{
        const abortError=Object.assign(new Error("Aborted"),{ name:"AbortError",});
        mockedGetDailyQuiz.mockRejectedValueOnce(abortError);
        renderQuizPage();
        await waitFor(()=>{
            expect(mockedGetDailyQuiz).toHaveBeenCalledTimes(1);
        });
        expect(screen.queryByText(/aborted/i)).not.toBeInTheDocument();
    });
    it("shows an error for an invalid topic without calling the API",async()=>{
        renderQuizPage("/quiz/topics/NOT_REAL");
        expect(await screen.findByText(/this quiz topic is invalid/i)).toBeInTheDocument();
        expect(mockedGetQuizTopic).not.toHaveBeenCalled();
        expect(mockedGetDailyQuiz).not.toHaveBeenCalled();
        expect(mockedGetQuizTopics).not.toHaveBeenCalled();
    });
});

//completed daily state
describe("QuizPage - completed daily state",()=>{
    it("shows the completed message and reward",async()=>{
        mockedGetDailyQuiz.mockResolvedValueOnce(COMPLETED);
        renderQuizPage();
        expect(await screen.findByText(/quiz type:\s*daily/i)).toBeInTheDocument();
        expect(screen.getByText(/already completed today's quiz/i)).toBeInTheDocument();
        expect(screen.getByText(/earned 50 xp and 25 coins/i)).toBeInTheDocument();
        expect(screen.getByRole("link",{name:/back to quests/i})).toHaveAttribute("href","/quests");
        expect(screen.queryByRole("button",{name:/start daily quiz|resume daily quiz/i})).not.toBeInTheDocument();
    });
});

//available daily state
describe("QuizPage - available daily state",()=>{
    it("shows the daily quiz details and Start button",async()=>{
        mockedGetDailyQuiz.mockResolvedValueOnce(AVAILABLE);
        renderQuizPage();
        expect(await screen.findByText(/quiz type:\s*daily/i)).toBeInTheDocument();
        expect(screen.getByText(/5 questions/i)).toBeInTheDocument();
        expect(screen.getByText(/50 xp/i)).toBeInTheDocument();
        expect(screen.getByText(/25 coins/i)).toBeInTheDocument();
        expect(screen.getByText(/knowledge streak:\s*3\s*\(best 7\)/i)).toBeInTheDocument();
        expect(screen.getByRole("button",{name:/start daily quiz/i})).toBeInTheDocument();
        expect(screen.queryByText(/in progress/i)).not.toBeInTheDocument();
    });
    it("loads the daily API and not the topic API",async()=>{
        mockedGetDailyQuiz.mockResolvedValueOnce(AVAILABLE);
        renderQuizPage();
        expect(await screen.findByText(/quiz type:\s*daily/i)).toBeInTheDocument();
        expect(mockedGetDailyQuiz).toHaveBeenCalledTimes(1);
        expect(mockedGetQuizTopic).not.toHaveBeenCalled();
    });
});

//in-progress daily state
describe("QuizPage - in-progress daily state",()=>{
    it("shows the progress and Resume daily quiz button",async()=>{
        mockedGetDailyQuiz.mockResolvedValueOnce(IN_PROGRESS);
        renderQuizPage();
        expect(await screen.findByRole("button",{name:/resume daily quiz/i})).toBeInTheDocument();
        expect(screen.getByText(/3 of 5 answered so far/i)).toBeInTheDocument();
        expect(screen.queryByRole("button",{name:/start daily quiz/i})).not.toBeInTheDocument();
        expect(screen.queryByText(/knowledge streak/i)).not.toBeInTheDocument();
    });
});

//starting daily sessions
describe("QuizPage - starting a daily session",()=>{
    it("calls clearError then startDailyQuiz and navigates on success",async()=>{
        const user=userEvent.setup();
        const startDailyQuiz=vi.fn().mockResolvedValue({id:"session-xyz"});
        const clearError=vi.fn();
        mockedGetDailyQuiz.mockResolvedValueOnce(AVAILABLE);
        mockedUseQuizSession.mockReturnValue(buildUseQuizSession({
            startDailyQuiz,
            clearError,
        }));
        renderQuizPage();
        await user.click(await screen.findByRole("button",{name:/start daily quiz/i}));
        expect(clearError).toHaveBeenCalledTimes(1);
        expect(startDailyQuiz).toHaveBeenCalledTimes(1);
        await waitFor(()=>{
            expect(mockNav).toHaveBeenCalledWith("/quiz/session/session-xyz");
        });
    });
    it("does not navigate if starting the daily session fails",async()=>{
        const user=userEvent.setup();
        const startDailyQuiz=vi.fn().mockResolvedValue(null);
        mockedGetDailyQuiz.mockResolvedValueOnce(AVAILABLE);
        mockedUseQuizSession.mockReturnValue(buildUseQuizSession({
            startDailyQuiz,
            error:"Couldn't start the quiz. Please try again.",
        }));
        renderQuizPage();
        await user.click(await screen.findByRole("button",{name:/start daily quiz/i}));
        expect(startDailyQuiz).toHaveBeenCalledTimes(1);
        expect(mockNav).not.toHaveBeenCalled();
        expect(screen.getByText(/couldn't start the quiz\. please try again\./i)).toBeInTheDocument();
    });
    it("disables the button and shows Starting while the daily session is loading",async()=>{
        mockedGetDailyQuiz.mockResolvedValueOnce(AVAILABLE);
        mockedUseQuizSession.mockReturnValue(buildUseQuizSession({isLoading:true,}));
        renderQuizPage();
        expect(await screen.findByRole("button",{name:/starting/i})).toBeDisabled();
    });
    it("uses startDailyQuiz when resuming an in-progress session",async()=>{
        const user=userEvent.setup();
        const startDailyQuiz=vi.fn().mockResolvedValue({id:IN_PROGRESS.session.id,});
        mockedGetDailyQuiz.mockResolvedValueOnce(IN_PROGRESS);
        mockedUseQuizSession.mockReturnValue(buildUseQuizSession({startDailyQuiz,}));
        renderQuizPage();
        await user.click(await screen.findByRole("button",{name:/resume daily quiz/i}));
        expect(startDailyQuiz).toHaveBeenCalledTimes(1);
        await waitFor(()=>{
            expect(mockNav).toHaveBeenCalledWith(`/quiz/session/${IN_PROGRESS.session.id}`);
        });
    });
    it("shows Resuming while the daily session is loading",async()=>{
        mockedGetDailyQuiz.mockResolvedValueOnce(IN_PROGRESS);
        mockedUseQuizSession.mockReturnValue(buildUseQuizSession({isLoading:true,}));
        renderQuizPage();
        expect(await screen.findByRole("button",{name:/resuming/i})).toBeDisabled();
    });
});

//topic state
describe("QuizPage - topic state",()=>{
    it("loads and displays the selected topic with its reward preview",async()=>{
        mockedGetQuizTopic.mockResolvedValueOnce(TOPIC);
        renderQuizPage("/quiz/topics/BUDGETING");
        expect(await screen.findByText(/quiz type:\s*topic/i)).toBeInTheDocument();
        expect(screen.getByRole("heading",{name:/budgeting/i})).toBeInTheDocument();
        expect(screen.getByText(/6 questions/i)).toBeInTheDocument();
        expect(screen.getByText(/30 xp/i)).toBeInTheDocument();
        expect(screen.getByText(/15 coins/i)).toBeInTheDocument();
        expect(screen.getByRole("button",{name:/start topic quiz/i})).toBeEnabled();
        expect(mockedGetQuizTopic).toHaveBeenCalledWith(
            "BUDGETING",
            expect.objectContaining({
                signal:expect.anything(),
            })
        );
        expect(mockedGetQuizTopics).toHaveBeenCalledWith(
            expect.objectContaining({signal:expect.anything(),})
        );
        expect(mockedGetDailyQuiz).not.toHaveBeenCalled();
    });
    it("normalises a lowercase topic from the URL",async()=>{
        mockedGetQuizTopic.mockResolvedValueOnce(TOPIC);
        renderQuizPage("/quiz/topics/budgeting");
        expect(await screen.findByText(/quiz type:\s*topic/i)).toBeInTheDocument();
        expect(mockedGetQuizTopic).toHaveBeenCalledWith("BUDGETING",expect.any(Object));
    });
    it("disables the start button when the topic is unavailable",async()=>{
        mockedGetQuizTopic.mockResolvedValueOnce(UNAVAILABLE_TOPIC);
        renderQuizPage("/quiz/topics/INTEREST");
        expect(await screen.findByText(/this topic quiz is not available yet/i)).toBeInTheDocument();
        expect(screen.getByRole("button",{name:/start topic quiz/i})).toBeDisabled();
    });
});

//starting topic sessions
describe("QuizPage - starting a topic session",()=>{
    it("calls startTopicQuiz with the selected topic and navigates",async()=>{
        const user=userEvent.setup();
        const startTopicQuiz=vi.fn().mockResolvedValue({id:"topic-session-123",});
        const clearError=vi.fn();
        mockedGetQuizTopic.mockResolvedValueOnce(TOPIC);
        mockedUseQuizSession.mockReturnValue(buildUseQuizSession({startTopicQuiz,clearError, }));
        renderQuizPage("/quiz/topics/BUDGETING");
        await user.click(await screen.findByRole("button",{name:/start topic quiz/i}));
        expect(clearError).toHaveBeenCalledTimes(1);
        expect(startTopicQuiz).toHaveBeenCalledTimes(1);
        expect(startTopicQuiz).toHaveBeenCalledWith("BUDGETING");
        await waitFor(()=>{
            expect(mockNav).toHaveBeenCalledWith("/quiz/session/topic-session-123");
        });
    });
    it("disables the button and shows Starting while the topic session is loading",async()=>{
        mockedGetQuizTopic.mockResolvedValueOnce(TOPIC);
        mockedUseQuizSession.mockReturnValue(buildUseQuizSession({isLoading:true,}));
        renderQuizPage("/quiz/topics/BUDGETING");
        expect(await screen.findByRole("button",{name:/starting/i})).toBeDisabled();
    });
});

//back navigation
describe("QuizPage - back navigation",()=>{
    it.each([
        ["available",AVAILABLE],
        ["in progress",IN_PROGRESS],
        ["completed",COMPLETED],
    ])("shows a Back to Quests link in the %s daily state",async(_label,fixture)=>{
        mockedGetDailyQuiz.mockResolvedValueOnce(fixture);
        renderQuizPage();
        expect(await screen.findByRole("link",{name:/back to quests/i})).toHaveAttribute("href","/quests");
    });
    it("shows a Back to Quests link for a topic quiz",async()=>{
        mockedGetQuizTopic.mockResolvedValueOnce(TOPIC);
        renderQuizPage("/quiz/topics/BUDGETING");
        expect(await screen.findByRole("link",{name:/back to quests/i})).toHaveAttribute("href","/quests");
    });
});