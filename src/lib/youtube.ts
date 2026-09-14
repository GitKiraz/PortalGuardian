/** Extrai o id do vídeo de links do YouTube (watch, youtu.be, embed, shorts, live). */
export function youtubeId(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^(www|m)\./, "");
    if (host === "youtu.be") return url.pathname.split("/")[1] || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = url.searchParams.get("v");
      if (v) return v;
      return url.pathname.match(/^\/(embed|shorts|live)\/([\w-]+)/)?.[2] ?? null;
    }
  } catch {}
  return null;
}

export const youtubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
