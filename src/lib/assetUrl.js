const baseUrl = import.meta.env.BASE_URL || "/";

function resolveLocalAssetPath(value) {
  const normalized = value.replace(/^\/+/, "");
  const encodedPath = normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${baseUrl}${encodedPath}`.replace(/([^:]\/)\/+/g, "$1");
}

export function resolveAssetUrl(value) {
  if (!value) {
    return value;
  }

  if (/^(https?:)?\/\//.test(value) || value.startsWith("data:")) {
    return value;
  }

  if (value.startsWith("/")) {
    return resolveLocalAssetPath(value);
  }

  return resolveLocalAssetPath(value);
}
