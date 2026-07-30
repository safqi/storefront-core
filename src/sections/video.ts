/**
 * Video URL → what the `video` section should render.
 *
 * A merchant pastes whatever their browser's address bar shows, which for
 * YouTube alone is five different shapes (watch?v=, youtu.be/, /embed/,
 * /shorts/, /live/). Normalising here means the component never has to know,
 * and an unrecognised URL degrades to a plain <video> rather than an iframe
 * pointing at a page that refuses to be framed.
 */

export type VideoSource =
  | { kind: "youtube"; id: string; embed: string }
  | { kind: "vimeo"; id: string; embed: string }
  | { kind: "file"; url: string }
  | null;

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"];
const VIMEO_HOSTS = ["vimeo.com", "www.vimeo.com", "player.vimeo.com"];

/** Extract a YouTube video id from any of its URL shapes. */
function youtubeId(url: URL): string | null {
  if (url.hostname.endsWith("youtu.be")) {
    return url.pathname.slice(1).split("/")[0] || null;
  }

  const v = url.searchParams.get("v");
  if (v) return v;

  const parts = url.pathname.split("/").filter(Boolean);
  const marker = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "live" || p === "v");
  if (marker !== -1 && parts[marker + 1]) return parts[marker + 1];

  return null;
}

function vimeoId(url: URL): string | null {
  const parts = url.pathname.split("/").filter(Boolean);
  // player.vimeo.com/video/{id} and vimeo.com/{id} both end in the id.
  const last = parts[parts.length - 1];
  return last && /^\d+$/.test(last) ? last : null;
}

export function parseVideo(raw: string, opts: { autoplay?: boolean; muted?: boolean } = {}): VideoSource {
  const value = (raw ?? "").trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (!/^https?:$/.test(url.protocol)) return null;

  // Autoplay is only honoured by browsers when the video is muted, so the two
  // params always travel together.
  const autoplay = opts.autoplay ? 1 : 0;
  const muted = opts.muted || opts.autoplay ? 1 : 0;

  if (YOUTUBE_HOSTS.includes(url.hostname)) {
    const id = youtubeId(url);
    if (!id) return null;
    return {
      kind: "youtube",
      id,
      embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=${autoplay}&mute=${muted}&rel=0&playsinline=1`,
    };
  }

  if (VIMEO_HOSTS.includes(url.hostname)) {
    const id = vimeoId(url);
    if (!id) return null;
    return {
      kind: "vimeo",
      id,
      embed: `https://player.vimeo.com/video/${id}?autoplay=${autoplay}&muted=${muted}&playsinline=1`,
    };
  }

  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url.pathname)) {
    return { kind: "file", url: value };
  }

  return null;
}

/** Tailwind aspect class for a merchant-picked ratio. Static so the JIT sees them. */
export const ASPECTS: Record<string, string> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "9/16": "aspect-[9/16]",
};
