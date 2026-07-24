import { haversineKm, type LatLng } from "./distance";

function buildDistanceMatrix(points: LatLng[]): number[][] {
  const n = points.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversineKm(points[i], points[j]);
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }
  return matrix;
}

function tourLength(order: number[], matrix: number[][]): number {
  let total = 0;
  for (let i = 0; i < order.length - 1; i++) total += matrix[order[i]][order[i + 1]];
  return total;
}

/** Greedy initial tour: from `start`, always hop to the nearest unvisited point. */
function nearestNeighbourOrder(matrix: number[][], start: number): number[] {
  const n = matrix.length;
  const visited = new Array(n).fill(false);
  const order = [start];
  visited[start] = true;

  for (let step = 1; step < n; step++) {
    const last = order[order.length - 1];
    let best = -1;
    let bestDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && matrix[last][j] < bestDist) {
        bestDist = matrix[last][j];
        best = j;
      }
    }
    order.push(best);
    visited[best] = true;
  }

  return order;
}

/**
 * 2-opt local search for an open path (no return to start): repeatedly
 * reverses the segment between two positions whenever doing so shortens the
 * tour, stopping when no single reversal improves it. Position 0 (the
 * start point) is kept fixed; the end of the path is free to change since a
 * day's itinerary doesn't loop back.
 */
function twoOptImprove(initialOrder: number[], matrix: number[][]): number[] {
  let best = [...initialOrder];
  const n = best.length;
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const candidate = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        if (tourLength(candidate, matrix) < tourLength(best, matrix)) {
          best = candidate;
          improved = true;
        }
      }
    }
  }

  return best;
}

export interface OptimizedRoute<T> {
  /** Input items reordered into the optimized visiting sequence. */
  items: T[];
  /** Indices into the original `points` array, in visiting order. */
  order: number[];
  totalDistanceKm: number;
}

/**
 * Orders a list of stops to (approximately) minimize total travel distance:
 * nearest-neighbour for a fast initial tour, then 2-opt to remove any
 * crossing/inefficient legs. `startIndex` pins which stop opens the day
 * (e.g. the one already first in an itinerary) — everything else is free
 * to reorder.
 */
export function optimizeRoute<T>(
  points: T[],
  getCoords: (point: T) => LatLng,
  startIndex = 0
): OptimizedRoute<T> {
  if (points.length === 0) {
    return { items: [], order: [], totalDistanceKm: 0 };
  }
  if (points.length === 1) {
    return { items: [...points], order: [0], totalDistanceKm: 0 };
  }

  const coords = points.map(getCoords);
  const matrix = buildDistanceMatrix(coords);
  const initial = nearestNeighbourOrder(matrix, startIndex);
  const order = twoOptImprove(initial, matrix);

  return {
    order,
    items: order.map((i) => points[i]),
    totalDistanceKm: tourLength(order, matrix),
  };
}
