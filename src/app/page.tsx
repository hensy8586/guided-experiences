import { Map } from "@/components/Map";

export default function Home() {
  return (
    <main className="min-h-[100svh] bg-stone-100 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 sm:pb-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="px-1 pb-3 sm:pb-4">
          <h1 className="text-xl font-semibold tracking-tight text-stone-950 sm:text-2xl">
            Guided Experiences
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-stone-600">
            Explore places through experiences created by people who know them.
          </p>
        </header>

        <Map />
      </div>
    </main>
  );
}
