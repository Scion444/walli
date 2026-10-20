const warmed = new Set();

export function warm(url) {
  if (!url || warmed.has(url)) return;
  warmed.add(url);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

// The preview uses the mid-size thumbnail, not the multi-MB original.
// (Apply still downloads the full file on the backend.)
export const previewSrc = (image) => image["thumbnail-original"] || image["thumbnail-large"] || image.url;

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
