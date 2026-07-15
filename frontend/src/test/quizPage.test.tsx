import * as React from "react";
import "@testing-library/jest-dom/vitest";
import {describe,it,expect,vi,beforeEach} from "vitest";
import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MemoryRouter} from "react-router-dom";
import QuizPage from "../domains/QuizPage";
import {getDailyQuiz} from "../features/quiz/quizApi";
import {useQuizSession} from "../hooks/useQuizSession";
import type { DailyQuizAvailable,DailyQuizCompleted,DailyQuizInProgress } from "../features/quiz/quizTypes";

//mocked stuff
const mockNav=vi.fn();
vi.mock("react-router-dom",async ()=>{
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
            <button onClick={onClick} disabled={disabled}>{children}</button>
        );
    },
}));

const mockedGetDailyQuiz=vi.mocked(getDailyQuiz);
const mockedUseQuizSession=vi.mocked(useQuizSession);

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

function buildUseQuizSession(overrides:Partial<ReturnType<typeof useQuizSession>>={}){
    return {
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

function renderQuizPage(){
    return render(
        <MemoryRouter>
            <QuizPage />
        </MemoryRouter>
    );
}

//tests assert on loading stage before data asyncWrapProviders,resolves getDailyQuiz thereafter
function deferred<T>(){
    let resolve!:(value:T)=>void;
    let reject!:(reason?:unknown)=>void;
    const promise=new Promise<T>((res,rej)=>{
        resolve=res;
        reject=rej;
    });
    return {promise,resolve,reject};
}

beforeEach(()=>{
    vi.clearAllMocks();
    mockedUseQuizSession.mockReturnValue(buildUseQuizSession());
});

//loading stat
describe("QuizPage - loading state",()=>{
    it("Shows a loading message while the daily quiz status is being fetched",async ()=>{
        const {promise}=deferred<DailyQuizAvailable>();
        mockedGetDailyQuiz.mockReturnValue(promise);
        renderQuizPage();
        expect(screen.getByText(/loading today's quiz/i)).toBeInTheDocument();
    });
});

//err state
describe("QuizPage — error state",()=>{
    it("shows an error message with Retry and Back to Quests when the fetch fails",async ()=>{
        mockedGetDailyQuiz.mockRejectedValueOnce(new Error("network down"));
        renderQuizPage();
        expect(
        await screen.findByText(/we couldn't load the quiz right now/i)
        ).toBeInTheDocument();
        expect(screen.getByRole("button",{name:/retry/i})).toBeInTheDocument();
        expect(
        screen.getByRole("link",{name:/back to quests/i})
        ).toHaveAttribute("href","/quests");
    });
    it("refetches when Retry is clicked",async ()=>{
        const user=userEvent.setup();
        mockedGetDailyQuiz.mockRejectedValueOnce(new Error("network down"));
        mockedGetDailyQuiz.mockResolvedValueOnce(AVAILABLE);
        renderQuizPage();
        await screen.findByText(/we couldn't load the quiz right now/i);
        expect(mockedGetDailyQuiz).toHaveBeenCalledTimes(1);
        await user.click(screen.getByRole("button",{name:/retry/i}));
        await screen.findByRole("button",{name:/start quiz/i});
        expect(mockedGetDailyQuiz).toHaveBeenCalledTimes(2);
    });
    it("does not treat an aborted request as an error",async ()=>{
        const abortError=Object.assign(new Error("aborted"),{
      name:"AbortError",
        });
        mockedGetDailyQuiz.mockRejectedValueOnce(abortError);
        renderQuizPage();
        await waitFor(()=>{
        expect(mockedGetDailyQuiz).toHaveBeenCalled();
        });
        expect(screen.queryByText(/we couldn't load the quiz right now/i)).not.toBeInTheDocument();
    });
});

//completestate
describe("QuizPage — completed state",()=>{
    it("shows the come-back-tomorrow message and today's reward",async ()=>{
        mockedGetDailyQuiz.mockResolvedValueOnce(COMPLETED);
        renderQuizPage();
        expect(await screen.findByText(/already completed today's quiz/i)).toBeInTheDocument();
        expect(screen.getByText(/earned 50 xp and 25 coins/i)).toBeInTheDocument();
        expect(screen.getByRole("link",{name:/back to quests/i})).toHaveAttribute("href","/quests");
        expect(screen.queryByRole("button",{name:/start quiz|resume quiz/i})).not.toBeInTheDocument();
    });
});

//available state
describe("QuizPage — available state",()=>{
  it("shows question count,reward preview,streak,and a Start Quiz button",async ()=>{
    mockedGetDailyQuiz.mockResolvedValueOnce(AVAILABLE);
    renderQuizPage();
    expect(await screen.findByText(/5 questions/i)).toBeInTheDocument();
    expect(screen.getByText(/50 xp/i)).toBeInTheDocument();
    expect(screen.getByText(/25 coins/i)).toBeInTheDocument();
    expect(screen.getByText(/knowledge streak:\s*3\s*\(best 7\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button",{name:/^start quiz$/i})).toBeInTheDocument();
    expect(screen.queryByText(/in progress/i)).not.toBeInTheDocument();
  });
});

//in-prog state
describe("QuizPage — in-progress state",()=>{
  it("shows a Resume Quiz button and the current progress instead of Start",async ()=>{
    mockedGetDailyQuiz.mockResolvedValueOnce(IN_PROGRESS);
    renderQuizPage();
    expect(await screen.findByRole("button",{name:/resume quiz/i})).toBeInTheDocument();
    expect(screen.getByText(/3 of 5 answered so far/i)).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:/^start quiz$/i})).not.toBeInTheDocument();
    expect(screen.queryByText(/knowledge streak/i)).not.toBeInTheDocument();
  });
});


//start/resume sessions
describe("QuizPage — starting a session",()=>{
    it("calls clearError then startDailyQuiz,and navigates to the new session on success",async ()=>{
        const user=userEvent.setup();
        mockedGetDailyQuiz.mockResolvedValueOnce(AVAILABLE);
        const startDailyQuiz=vi.fn().mockResolvedValue({ id:"session-xyz" });
        const clearError=vi.fn();
        mockedUseQuizSession.mockReturnValue(buildUseQuizSession({ startDailyQuiz,clearError }));
        renderQuizPage();
        const startButton=await screen.findByRole("button",{name:/^start quiz$/i,});
        await user.click(startButton);
        expect(clearError).toHaveBeenCalledTimes(1);
        expect(startDailyQuiz).toHaveBeenCalledTimes(1);
        await waitFor(()=>{
            expect(mockNav).toHaveBeenCalledWith("/quiz/sessions/session-xyz");
        });
    });
    it("does not navigate if starting the session fails",async ()=>{
        const user=userEvent.setup();
        mockedGetDailyQuiz.mockResolvedValueOnce(AVAILABLE);
        const startDailyQuiz=vi.fn().mockResolvedValue(null);
        mockedUseQuizSession.mockReturnValue(buildUseQuizSession({
            startDailyQuiz,
            error:"Couldn't start the quiz. Please try again.",
        }));
        renderQuizPage();
        const startButton=await screen.findByRole("button",{name:/^start quiz$/i,});
        await user.click(startButton);
        expect(startDailyQuiz).toHaveBeenCalledTimes(1);
        expect(mockNav).not.toHaveBeenCalled();
        expect(screen.getByText(/couldn't start the quiz\. please try again\./i)).toBeInTheDocument();
    });
    it("disables the button and shows a starting label while the session is being created",async ()=>{
        mockedGetDailyQuiz.mockResolvedValueOnce(AVAILABLE);
        mockedUseQuizSession.mockReturnValue(buildUseQuizSession({ isLoading:true }));
        renderQuizPage();
        const startingButton=await screen.findByRole("button",{name:/starting/i,});
        expect(startingButton).toBeDisabled();
    });
    it("resuming an in-progress session also goes through startDailyQuiz (idempotent POST per contract)",async ()=>{
        const user=userEvent.setup();
        mockedGetDailyQuiz.mockResolvedValueOnce(IN_PROGRESS);
        const startDailyQuiz=vi.fn().mockResolvedValue({ id:IN_PROGRESS.session.id });
        mockedUseQuizSession.mockReturnValue(buildUseQuizSession({ startDailyQuiz }));
        renderQuizPage();
        const resumeButton=await screen.findByRole("button",{name:/resume quiz/i,});
        await user.click(resumeButton);
        expect(startDailyQuiz).toHaveBeenCalledTimes(1);
        await waitFor(()=>{
            expect(mockNav).toHaveBeenCalledWith(`/quiz/sessions/${IN_PROGRESS.session.id}`);
        });
    });
});

//nav present in every non loading state
describe("QuizPage — back navigation",()=>{
    it.each([
        ["available",AVAILABLE],
        ["in progress",IN_PROGRESS],
        ["completed",COMPLETED],
    ])("shows a Back to Quests link in the %s state",async (_label,fixture)=>{
        mockedGetDailyQuiz.mockResolvedValueOnce(fixture);
        renderQuizPage();
        const link=await screen.findByRole("link",{name:/back to quests/i});
        expect(link).toHaveAttribute("href","/quests");
    });
});