import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <main className="min-h-[100svh] bg-stone-100 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-semibold text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Guided Experiences
        </Link>
        <section className="mt-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          {children}
        </section>
      </div>
    </main>
  );
}
