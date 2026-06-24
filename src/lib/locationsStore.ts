export type StoredLocation = {
  id: string;
  name: string;
  address: string;
  nearbyCompetitors: string;
  observations: number;
};

const key = (userId: string) => `ps_locations_${userId}`;

export function getLocations(userId: string): StoredLocation[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key(userId)) : null;
    return raw ? (JSON.parse(raw) as StoredLocation[]) : [];
  } catch {
    return [];
  }
}

export function saveLocations(userId: string, locs: StoredLocation[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key(userId), JSON.stringify(locs));
}
