export async function getEmbedUrls(
  malId: string | number,
  episodeNumber: number
): Promise<{ sub?: string; dub?: string } | null> {
  try {
    const base = `https://megaplay.buzz/stream/mal/${malId}/${episodeNumber}`;
    return {
      sub: `${base}/sub`,
      dub: `${base}/dub`,
    };
  } catch {
    return null;
  }
}