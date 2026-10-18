"use client";

import { useActionState, useState } from "react";
import type { ExperienceStop } from "@/domain/experience";
import { StopLocationMap } from "@/components/StopLocationMap";
import { mutateStop } from "./stop-actions";
import {
  INITIAL_STOP_ACTION_STATE,
  type StopActionState,
} from "@/lib/stop-action-result";

const button = "min-h-11 rounded-lg border border-stone-300 px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-40";
const input = "mt-1 block w-full rounded-lg border border-stone-300 p-3 focus-visible:outline-2 focus-visible:outline-emerald-700";

function StopForm({ experienceId, stop, previous, onClose }: {
  experienceId: string; stop?: ExperienceStop; previous?: ExperienceStop; onClose: () => void;
}) {
  const [title, setTitle] = useState(stop?.title ?? "");
  const [description, setDescription] = useState(stop?.description ?? "");
  const [latitude, setLatitude] = useState(String(stop?.latitude ?? previous?.latitude ?? 45.056));
  const [longitude, setLongitude] = useState(String(stop?.longitude ?? previous?.longitude ?? -92.806));
  const [radius, setRadius] = useState(String(stop?.triggerRadiusMeters ?? 40));
  const [state, action, pending] = useActionState(async (state: StopActionState, form: FormData) => {
    const result = await mutateStop(experienceId, stop?.id ?? null, stop ? "edit" : "add", state, form);
    if (result.status === "success") onClose();
    return result;
  }, INITIAL_STOP_ACTION_STATE);
  const lat = Number(latitude), lng = Number(longitude);
  const coordinates = latitude.trim() && longitude.trim() && Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { latitude: lat, longitude: lng } : null;
  return <form action={action} className="mt-5 space-y-4 border-t border-stone-200 pt-5">
    <h3 className="text-lg font-semibold">{stop ? "Edit stop" : "Add stop"}</h3>
    <fieldset disabled={pending} className="space-y-4">
      <label className="block">Title<input name="title" required className={input} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label className="block">Description<textarea name="description" rows={3} className={input} value={description} onChange={e => setDescription(e.target.value)} /></label>
      <StopLocationMap coordinates={coordinates} onSelect={point => {
        setLatitude(point.latitude.toFixed(6)); setLongitude(point.longitude.toFixed(6));
      }} />
      <label className="block">Latitude<input name="latitude" type="number" step="any" min={-90} max={90} required className={input} value={latitude} onChange={e => setLatitude(e.target.value)} /></label>
      <label className="block">Longitude<input name="longitude" type="number" step="any" min={-180} max={180} required className={input} value={longitude} onChange={e => setLongitude(e.target.value)} /></label>
      <label className="block">Trigger radius (meters)<input name="radius" type="number" step={1} min={1} max={2147483647} required className={input} value={radius} onChange={e => setRadius(e.target.value)} /></label>
      <div className="flex gap-3"><button className={`${button} bg-emerald-700 text-white`} type="submit">{pending ? "Saving…" : "Save stop"}</button>
        <button className={button} type="button" onClick={onClose}>Cancel</button></div>
    </fieldset>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite"
      className={`text-sm ${state.status === "error" ? "text-red-800" : "text-emerald-800"}`}>
      {state.message}
    </p> : null}
  </form>;
}

export function StopEditor({ experienceId, stops }: { experienceId: string; stops: ExperienceStop[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [state, action, pending] = useActionState(async (state: StopActionState, form: FormData) => {
    const operation = form.get("operation");
    if (operation !== "up" && operation !== "down" && operation !== "delete") {
      return INITIAL_STOP_ACTION_STATE;
    }
    return mutateStop(experienceId, String(form.get("stopId")), operation, state, form);
  }, INITIAL_STOP_ACTION_STATE);
  return <section className="mt-8 border-t border-stone-200 pt-6" aria-labelledby="stops-heading">
    <div className="flex items-center justify-between gap-3"><h2 id="stops-heading" className="text-xl font-semibold">Stops</h2>
      <button type="button" className={button} disabled={pending || editing !== null} onClick={() => setEditing("new")}>Add stop</button></div>
    {stops.length === 0 ? <p className="mt-4 text-stone-600">No Stops yet. Add the first location for this Experience.</p> : null}
    <ol className="divide-y divide-stone-200">
      {stops.map((stop, index) => <li key={stop.id} className="py-4">
        <h3 className="font-semibold">{stop.position + 1}. {stop.title}</h3>
        <p className="text-sm text-stone-600">{stop.latitude.toFixed(6)}, {stop.longitude.toFixed(6)} · {stop.triggerRadiusMeters} m radius</p>
        <form action={action} className="mt-2 flex flex-wrap gap-2" onSubmit={event => {
          const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.value === "delete" && !window.confirm(`Delete “${stop.title}”? This cannot be undone.`)) event.preventDefault();
        }}>
          <input type="hidden" name="stopId" value={stop.id} />
          <button type="button" className={button} disabled={pending || editing !== null} onClick={() => setEditing(stop.id)}>Edit</button>
          <button name="operation" value="up" className={button} disabled={pending || editing !== null || index === 0}>Move up</button>
          <button name="operation" value="down" className={button} disabled={pending || editing !== null || index === stops.length - 1}>Move down</button>
          <button name="operation" value="delete" className={`${button} text-red-800`} disabled={pending || editing !== null}>Delete</button>
        </form>
      </li>)}
    </ol>
    <p
      role={state.status === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`mt-2 text-sm ${state.status === "error" ? "text-red-800" : "text-stone-700"}`}
    >
      {pending ? "Saving…" : state.message}
    </p>
    {editing !== null ? <StopForm key={editing} experienceId={experienceId}
      stop={stops.find(stop => stop.id === editing)} previous={stops.at(-1)} onClose={() => setEditing(null)} /> : null}
  </section>;
}
