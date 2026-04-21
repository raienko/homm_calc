import { useEffect, useState } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function withBasePath(path) {
  if (!basePath || path.startsWith(basePath)) {
    return path;
  }

  return `${basePath}${path}`;
}

function getPath() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";

  if (basePath && pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length) || "/";
  }

  return pathname;
}

export function navigate(to) {
  window.history.pushState({}, "", withBasePath(to));
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useRoute() {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const handleRouteChange = () => setPath(getPath());

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  return path;
}

export function Link({ children, to, ...props }) {
  function handleClick(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    navigate(to);
  }

  return (
    <a href={withBasePath(to)} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
