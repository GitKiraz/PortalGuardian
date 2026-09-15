const VIDEO_ID = /^[\w-]{11}$/;

/** Extrai o id do vídeo de links do YouTube (watch, youtu.be, embed, shorts, live). */
export function youtubeId(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^(www|m)\./, "");
    let id: string | null | undefined = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = url.searchParams.get("v") ?? url.pathname.match(/^\/(embed|shorts|live)\/([\w-]+)/)?.[2];
    }
    // Ids têm 11 caracteres [A-Za-z0-9_-]; qualquer outra coisa não entra na URL do iframe.
    return id && VIDEO_ID.test(id) ? id : null;
  } catch {}
  return null;
}

export const youtubeThumbnailUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export const youtubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
