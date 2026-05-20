// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import heroImg from './assets/hero.png'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <section id="center">
//         <div className="hero">
//           <img src={heroImg} className="base" width="170" height="179" alt="" />
//           <img src={reactLogo} className="framework" alt="React logo" />
//           <img src={viteLogo} className="vite" alt="Vite logo" />
//         </div>
//         <div>
//           <h1>Get started</h1>
//           <p>
//             Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
//           </p>
//         </div>
//         <button
//           type="button"
//           className="counter"
//           onClick={() => setCount((count) => count + 1)}
//         >
//           Count is {count}
//         </button>
//       </section>

//       <div className="ticks"></div>

//       <section id="next-steps">
//         <div id="docs">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#documentation-icon"></use>
//           </svg>
//           <h2>Documentation</h2>
//           <p>Your questions, answered</p>
//           <ul>
//             <li>
//               <a href="https://vite.dev/" target="_blank">
//                 <img className="logo" src={viteLogo} alt="" />
//                 Explore Vite
//               </a>
//             </li>
//             <li>
//               <a href="https://react.dev/" target="_blank">
//                 <img className="button-icon" src={reactLogo} alt="" />
//                 Learn more
//               </a>
//             </li>
//           </ul>
//         </div>
//         <div id="social">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#social-icon"></use>
//           </svg>
//           <h2>Connect with us</h2>
//           <p>Join the Vite community</p>
//           <ul>
//             <li>
//               <a href="https://github.com/vitejs/vite" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#github-icon"></use>
//                 </svg>
//                 GitHub
//               </a>
//             </li>
//             <li>
//               <a href="https://chat.vite.dev/" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#discord-icon"></use>
//                 </svg>
//                 Discord
//               </a>
//             </li>
//             <li>
//               <a href="https://x.com/vite_js" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#x-icon"></use>
//                 </svg>
//                 X.com
//               </a>
//             </li>
//             <li>
//               <a href="https://bsky.app/profile/vite.dev" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#bluesky-icon"></use>
//                 </svg>
//                 Bluesky
//               </a>
//             </li>
//           </ul>
//         </div>
//       </section>

//       <div className="ticks"></div>
//       <section id="spacer"></section>
//     </>
//   )
// }

// export default App

// Ally testing for buttons
// import {LongButton} from "@/components/common/LongButton"
// import { IconButton } from "@/components/common/IconButton";
// export default function App(){
//   return(
//     <main className="min-h-screen bg-[#f4fbf7] p-8">
//       <div className="mx-auto flex max-w-sm flex-col gap-6">
//         <LongButton LongVariant="primaryDark" showArrow>
//           Primary Dark
//         </LongButton>
//         <LongButton LongVariant="primaryPink" showArrow>
//           Primary Pink
//         </LongButton>
//         <LongButton LongVariant="primaryMint" showArrow>
//           Primary Mint
//         </LongButton>
//         <LongButton LongVariant="primaryYellow" showArrow>
//           Primary Yellow
//         </LongButton>
//         <LongButton LongVariant="outline" showArrow>
//           Outline (for google)
//         </LongButton>
//         <LongButton LongVariant="primaryPinkBorder">
//           PrimaryPinkBorder
//         </LongButton>
//         <IconButton IconVariant="iconBack"/>
//         <IconButton IconVariant="iconRefresh"/>
//         <IconButton IconVariant="iconEdit"/>
//         <IconButton IconVariant="iconCancel"/>
//         <IconButton IconVariant="iconNotif"/>
//       </div>
//     </main>
//   )
// }

//testing for input
// import { CustomInput } from "@/components/common/CustomInput";
// export default function App(){
//   return(  
//     <main className="min-h-screen bg-[#f4fbf7] p-8">
//       <div className="mx-auto flex max-w-sm flex-col gap-6">
//           <CustomInput variant="form" placeholder="Form input component"/>
//           <CustomInput variant="regLog" placeholder="Reg/Loging input component"/>
//       </div>
//     </main>
//   )
// }
//Ally testing for cards
// import { CustomCard } from "@/components/ui/CustomCard";
// export default function App() {
//   const variants = ["greenShaddow","navyShaddow","navyBorder"] as const;
//   const sizes = ["sm", "md", "lg"] as const;

//   return (
//     <main className="min-h-screen bg-[#f4fbf7] p-8">
//       <div className="mx-auto flex max-w-md flex-col gap-6">
//         {variants.map((variant)=>(
//           <div key={variant} className="flex flex-col gap-4">
//             <h2 className="font-semibold text-lg">{variant}</h2>
//             {sizes.map((size)=>(
//               <CustomCard
//                 key={`${variant}-${size}`}
//                 variant={variant}
//                 size={size}
//                 title={`Title ${variant}-${size}`}
//               >
//                 <span className="text-gray-700">This is a {variant} card of size {size}</span>
//               </CustomCard>
//             ))}
//           </div>
//         ))}
//       </div>
//     </main>
//   );
// }

//testing for badges
import { CustomBadge } from "@/components/common/CustomBadges"
export default function App(){
  return(
    <main className="min-h-screen bg-[#f4fbf7] p-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <CustomBadge variant="xp">+25 XP</CustomBadge>
        <CustomBadge variant="tier">Rare Tier</CustomBadge>
        <CustomBadge variant="streak">7 Day Streak</CustomBadge>
        <CustomBadge variant="level">Lvl 4</CustomBadge>
      </div>
    </main>
  );
}