import { useEffect, useState } from "react";

function getPath() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

export function navigate(to) {
  window.history.pushState({}, "", to);
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
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
