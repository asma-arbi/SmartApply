export type NetworkTargetType = "company" | "candidate";
export type ConnectStatus = "none" | "pending" | "connected";

type NetworkState = {
  follows: string[]; // `${type}:${id}`
  connects: Record<string, ConnectStatus>; // candidate keys only
};

function key(type: NetworkTargetType, id: string) {
  return `${type}:${id}`;
}

function storageKey(userId: string) {
  return `smartapply:network:${userId}`;
}

function empty(): NetworkState {
  return { follows: [], connects: {} };
}

function read(userId: string): NetworkState {
  if (typeof window === "undefined" || !userId) return empty();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as NetworkState;
    return {
      follows: Array.isArray(parsed.follows) ? parsed.follows : [],
      connects: parsed.connects && typeof parsed.connects === "object" ? parsed.connects : {},
    };
  } catch {
    return empty();
  }
}

function write(userId: string, state: NetworkState) {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("smartapply:network", { detail: { userId } }));
}

export function isFollowing(userId: string, type: NetworkTargetType, id: string) {
  return read(userId).follows.includes(key(type, id));
}

export function toggleFollow(userId: string, type: NetworkTargetType, id: string) {
  const state = read(userId);
  const k = key(type, id);
  const next = state.follows.includes(k)
    ? state.follows.filter((item) => item !== k)
    : [...state.follows, k];
  write(userId, { ...state, follows: next });
  return next.includes(k);
}

export function connectStatus(userId: string, candidateId: string): ConnectStatus {
  return read(userId).connects[key("candidate", candidateId)] ?? "none";
}

/** LinkedIn-like: first click = request pending, second accept = connected (demo). */
export function requestOrAcceptConnect(userId: string, candidateId: string): ConnectStatus {
  const state = read(userId);
  const k = key("candidate", candidateId);
  const current = state.connects[k] ?? "none";
  const next: ConnectStatus =
    current === "none" ? "pending" : current === "pending" ? "connected" : "none";
  write(userId, {
    ...state,
    connects: { ...state.connects, [k]: next },
  });
  return next;
}
