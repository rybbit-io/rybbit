import { Tilt_Warp } from "next/font/google";
import { cn } from "../../lib/utils";
import Image from "next/image";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
  weight: "400",
});

export default function ScPage() {
  return (
    <div className="flex flex-col items-center justify-center overflow-x-hidden">
      <div className="flex items-center justify-between mb-10 mt-20">
        <div>
          <h1
            className={cn(
              "text-[80px] leading-[1] font-semibold tracking-tight max-w-6xl text-center text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-100 to-gray-400",
              tilt_wrap.className
            )}
          >
            The Open Source Google Analytics Replacement
          </h1>
        </div>
        {/* <Image
          src="/rybbit-text.svg"
          alt="Rybbit Analytics"
          width={200}
          height={750}
        /> */}
      </div>
      {/* <h2 className="text-lg md:text-2xl pt-4 md:pt-6 px-4 tracking-tight max-w-3xl text-center text-neutral-300">
    Next-gen, open source, lightweight, cookieless web & product analytics
    for everyone.
  </h2>

  <div className="flex flex-col sm:flex-row my-8 md:my-10 items-center justify-center gap-4 md:gap-6 text-base md:text-lg px-4">
    <Link
      href="https://app.rybbit.io/signup"
      className="w-full sm:w-auto"
      data-rybbit-event="signup"
      data-rybbit-prop-location="hero"
    >
      <button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer">
        Track your Site
      </button>
    </Link>
    <Link
      href="https://demo.rybbit.io/1"
      className="w-full sm:w-auto"
      data-rybbit-event="demo"
    >
      <button className="w-full sm:w-auto bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-5 py-3 rounded-lg border border-neutral-600 transform hover:-translate-y-0.5 transition-all duration-200 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50 cursor-pointer">
        View Live Demo
      </button>
    </Link>
  </div> */}

      <div className="relative w-full max-w-[1300px] mb-10 px-4">
        {/* Background gradients - overlapping circles for organic feel */}
        <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-emerald-500/40 rounded-full blur-[80px] opacity-70"></div>
        <div className="absolute top-20 left-20 w-[400px] h-[400px] bg-emerald-600/30 rounded-full blur-[70px] opacity-50"></div>

        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/40 rounded-full blur-[80px] opacity-60"></div>
        <div className="absolute bottom-40 right-20 w-[350px] h-[350px] bg-indigo-500/30 rounded-full blur-[75px] opacity-50"></div>

        <div className="absolute top-1/4 right-0 w-[320px] h-[320px] bg-purple-500/40 rounded-full blur-[70px] opacity-50"></div>
        <div className="absolute top-1/3 right-20 w-[250px] h-[250px] bg-violet-500/30 rounded-full blur-[65px] opacity-40"></div>

        <div className="absolute bottom-1/3 left-0 w-[320px] h-[320px] bg-emerald-400/30 rounded-full blur-[70px] opacity-60"></div>
        <div className="absolute bottom-1/4 left-20 w-[240px] h-[240px] bg-teal-400/25 rounded-full blur-[65px] opacity-50"></div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-indigo-400/30 rounded-full blur-[80px] opacity-50"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/3 -translate-y-1/3 w-[350px] h-[350px] bg-sky-400/20 rounded-full blur-[75px] opacity-40"></div>

        {/* Iframe container with responsive visibility */}
        <div className="relative z-10 rounded-lg overflow-hidden border-4 border-neutral-100/5 shadow-2xl shadow-emerald-900/10">
          {/* Remove mobile message and show iframe on all devices */}
          <iframe
            src="https://demo.rybbit.io/1"
            width="1300"
            height="750"
            className="w-full h-[600px] md:h-[700px] lg:h-[750px]"
            style={{ border: "none" }}
            title="Rybbit Analytics Demo"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
