import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Map } from "@/components/Map";
import { isUuid } from "@/lib/creator-experiences";
import { getPublishedExperience } from "@/lib/published-experiences";

export const instant = false;

export default async function PublicExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const experience = await getPublishedExperience(id.toLowerCase());
  if (!experience) notFound();
  return <main className="min-h-[100svh] bg-stone-100 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
    <div className="mx-auto max-w-6xl">
      <h1 className="pb-3 text-xl font-semibold">Guided Experiences</h1>
      <Map experience={experience} />
    </div>
  </main>;
}
