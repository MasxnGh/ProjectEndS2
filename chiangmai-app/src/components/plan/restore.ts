import { useTripStore, UNSCHEDULED } from "@/lib/trip-store";

/**
 * Puts a place back where it was removed from, for a toast's Undo.
 *
 * The old planner undid a removal with `moveItem`, which does nothing once a
 * place is in no list at all, so Undo quietly failed. This composes the
 * store's existing actions instead — no new rules: a place that is gone from
 * the plan comes back through the tray (`addPlace`) and is moved to its old
 * spot; one that still sits on another day (a duplicate) is duplicated back.
 */
export function restoreToContainer(slug: string, containerId: string, index: number) {
  const store = useTripStore.getState();
  if (store.containers[containerId]?.includes(slug)) return;

  if (!store.locationOf(slug)) {
    store.addPlace(slug);
    useTripStore.getState().moveItem({ slug, toContainer: containerId, toIndex: index });
    return;
  }

  if (containerId === UNSCHEDULED) return;
  store.duplicateToDay(slug, containerId);
  const list = useTripStore.getState().containers[containerId].filter((s) => s !== slug);
  list.splice(Math.min(index, list.length), 0, slug);
  useTripStore.getState().reorderDay(containerId, list);
}

/**
 * Moves one copy of a place from a named list to another, for drags and "move
 * to". `moveItem` finds the place by its slug alone, so a place on two days
 * (a duplicate) moved whichever copy came first. This names the source list,
 * using the store's own `reorderDay` — the same lists, no new rules. A list
 * that already holds the place is left alone (a day never has it twice).
 * Returns whether anything moved.
 */
export function moveFromTo(slug: string, fromId: string, toId: string, toIndex: number): boolean {
  const { containers, reorderDay } = useTripStore.getState();
  const from = containers[fromId] ?? [];
  if (!from.includes(slug)) return false;
  const rest = from.filter((s) => s !== slug);
  if (fromId === toId) {
    rest.splice(Math.max(0, Math.min(toIndex, rest.length)), 0, slug);
    reorderDay(fromId, rest);
    return true;
  }
  const to = [...(containers[toId] ?? [])];
  if (to.includes(slug)) return false;
  to.splice(Math.max(0, Math.min(toIndex, to.length)), 0, slug);
  reorderDay(fromId, rest);
  useTripStore.getState().reorderDay(toId, to);
  return true;
}
