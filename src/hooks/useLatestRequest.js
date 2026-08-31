import { useCallback, useRef } from "react";

// Guards against out-of-order async responses — e.g. React StrictMode
// double-invoking an effect in development, or a filter changing before the
// previous fetch for it has resolved. Only the response from the most
// recently issued call is applied; any earlier ones are silently dropped.
export const useLatestRequest = () => {
  const idRef = useRef(0);
  const begin = useCallback(() => (idRef.current += 1), []);
  const isCurrent = useCallback((id) => id === idRef.current, []);
  return { begin, isCurrent };
};
