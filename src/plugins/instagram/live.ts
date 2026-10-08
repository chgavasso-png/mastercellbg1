import { useEffect, useState } from "react";
import { createDocument, useDocument } from "@/core/store";

export type LivePost = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
};

export const instaConfig = createDocument<{ token?: string; tokenAt?: string; endpoint?: string; limit: number }>("insta-config", { limit: 6 });

const cache = createDocument<{ posts: LivePost[]; at?: string; error?: string }>("insta-cache", { posts: [] });

const GRAPH = "https://graph.instagram.com";
const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count";
const FRESH = 30 * 60 * 1000;
const REFRESH_AFTER = 30 * 864e5;

const normalize = (p: Record<string, any>): LivePost => ({
  id: String(p.id),
  caption: p.caption ?? p.prunedCaption,
  media_type: p.media_type ?? p.mediaType ?? "IMAGE",
  media_url: p.media_url ?? p.mediaUrl ?? p.sizes?.medium?.mediaUrl,
  thumbnail_url: p.thumbnail_url ?? p.thumbnailUrl,
  permalink: p.permalink,
  timestamp: p.timestamp,
  like_count: p.like_count ?? p.likeCount,
});

export const isConnected =() => Boolean(instaConfig.get().token || instaConfig.get().endpoint);

async function refreshToken() {
  const { token, tokenAt } = instaConfig.get();
  if (!token || (tokenAt && Date.now() - new Date(tokenAt).getTime() < REFRESH_AFTER)) return;
  const res = await fetch(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
  if (!res.ok) return;
  const body = await res.json();
  if (body.access_token) instaConfig.set({ token: body.access_token, tokenAt: new Date().toISOString() });
}

export async function fetchLatest(force = false) {
  const { token, endpoint, limit } = instaConfig.get();
  const current = cache.get();
  if (!token && !endpoint) return current.posts;
  if (!force && current.at && Date.now() - new Date(current.at).getTime() < FRESH) return current.posts;

  try {
    if (!endpoint) await refreshToken();
    const url = endpoint
      ? endpoint
      : `${GRAPH}/me/media?fields=${FIELDS}&limit=${limit}&access_token=${encodeURIComponent(instaConfig.get().token!)}`;
    const res = await fetch(url);
    const body = await res.json();
    if (!res.ok || body.error) throw new Error(body.error?.message ?? `Erro ${res.status}`);
    const list: Record<string, any>[] = Array.isArray(body) ? body : body.data ?? body.posts ?? [];
    const posts = list
      .map(normalize)
      .filter((p) => p.media_url || p.thumbnail_url)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
    cache.set({ posts, at: new Date().toISOString(), error: undefined });
    return posts;
  } catch (e) {
    cache.set({ error: (e as Error).message });
    if (force) throw e;
    return current.posts;
  }
}

export function clearLive() {
  cache.set({ posts: [], at: undefined, error: undefined });
}

export function useLatestPosts() {
  const config = useDocument(instaConfig);
  const state = useDocument(cache);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!config.token && !config.endpoint) return;
    setLoading(true);
    fetchLatest().finally(() => setLoading(false));
  }, [config.token, config.endpoint, config.limit]);

  return { posts: config.token || config.endpoint ? state.posts : [], error: state.error, at: state.at, loading };
}

export const mediaOf = (p: LivePost) => (p.media_type === "VIDEO" ? p.thumbnail_url : p.media_url) ?? p.thumbnail_url;
