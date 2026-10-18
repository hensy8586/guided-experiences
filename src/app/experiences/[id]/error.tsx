"use client";

export default function ExperienceError({ reset }: { reset: () => void }) {
  return <main className="p-6">
    <h1 className="text-xl font-semibold">Unable to load this Experience</h1>
    <p role="alert" className="my-3">Please try again in a moment.</p>
    <button onClick={reset} className="min-h-11 rounded border px-4 focus-visible:outline-2">Try again</button>
  </main>;
}
