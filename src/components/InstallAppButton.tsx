import React from "react";

export const InstallButton: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
    const [showBanner, setShowBanner] = React.useState(false);

    React.useEffect(() => {
        const dismissCount = parseInt(localStorage.getItem("installBannerDismissCount") || "0", 10);
        const lastDismissed = localStorage.getItem("installBannerDismissed");
        if (lastDismissed) {
            const lastDismissedDate = new Date(lastDismissed);
            const now = new Date();
            const daysToWait = Math.pow(2, dismissCount)-1;
            const diffInDays = (now.getTime() - lastDismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (diffInDays < daysToWait) {
                return;
            }
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowBanner(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === "accepted") {
                    console.log("User accepted the install prompt");
                }
                setDeferredPrompt(null);
                setShowBanner(false);
            });
        }
    };

    const handleDismiss = () => {
        const dismissCount = parseInt(localStorage.getItem("installBannerDismissCount") || "0", 10) + 1;
        localStorage.setItem("installBannerDismissCount", dismissCount.toString());
        localStorage.setItem("installBannerDismissed", new Date().toISOString());
        setShowBanner(false);
    };

    if (!showBanner) {
        return null;
    }

    return (
        <div className="install-banner bg-yellow-300 text-black p-2 w-full flex justify-between items-center">
            <p className="mr-4 text-sm">Install our app for a better experience!</p>
            <div className="flex items-center">
                <button onClick={handleInstall} className="btn bg-blue-500 text-sm text-white px-3 py-1 rounded hover:bg-blue-600 mr-2">
                    Install App
                </button>
                <button onClick={handleDismiss} className="btn bg-gray-500 text-sm text-white px-3 py-1 rounded hover:bg-gray-600">
                    Dismiss
                </button>
            </div>
        </div>
    );
};