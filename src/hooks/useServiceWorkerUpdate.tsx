import { useState, useEffect, useCallback } from "react";

interface ServiceWorkerUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => void;
}

export const useServiceWorkerUpdate = (): ServiceWorkerUpdateState => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if service worker is supported
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const handleControllerChange = () => {
      // Service worker has been updated, reload the page
      window.location.reload();
    };

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          setRegistration(reg);

          // Check for updates periodically
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New content is available
                  setNeedRefresh(true);
                } else if (newWorker.state === "activated") {
                  setOfflineReady(true);
                }
              });
            }
          });

          // Check if there's already a waiting worker
          if (reg.waiting) {
            setNeedRefresh(true);
          }
        }

        // Listen for controller changes (happens when skipWaiting is called)
        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
      } catch (error) {
        console.error("Error registering service worker:", error);
      }
    };

    registerSW();

    // Check for updates every 60 seconds
    const intervalId = setInterval(() => {
      if (registration) {
        registration.update().catch(console.error);
      }
    }, 60 * 1000);

    return () => {
      clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, [registration]);

  const updateServiceWorker = useCallback(() => {
    if (registration?.waiting) {
      // Tell the waiting service worker to activate
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      // Just reload if no waiting worker
      window.location.reload();
    }
  }, [registration]);

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
  };
};

export default useServiceWorkerUpdate;
