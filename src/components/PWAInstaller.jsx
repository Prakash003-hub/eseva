import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export default function PWAInstaller() {
  const [installPrompt, setInstallPrompt] = useState(() => (typeof window !== "undefined" ? window.deferredPrompt : null));
  const [installed, setInstalled] = useState(() => (typeof window !== "undefined" ? window.matchMedia("(display-mode: standalone)").matches : false));

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      window.deferredPrompt = event;
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      window.deferredPrompt = null;
    };

    if (window.deferredPrompt) {
      setInstallPrompt(window.deferredPrompt);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("pwa-prompt-ready", () => {
      if (window.deferredPrompt) {
        setInstallPrompt(window.deferredPrompt);
      }
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();

    const result = await installPrompt.userChoice;

    if (result && result.outcome === "accepted") {
      setInstallPrompt(null);
      window.deferredPrompt = null;
    } else {
      setInstallPrompt(null);
      window.deferredPrompt = null;
    }
  };

  // Only display when not yet installed AND the browser install prompt is ready
  if (installed || !installPrompt) return null;

  return (
    <div
      className="pwa-install-banner premium-card"
      style={{
        gridColumn: "span 2",
        background: "linear-gradient(135deg, #047857 0%, #10b981 100%)",
        color: "white",
        borderRadius: "16px",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        boxShadow: "0 8px 20px rgba(4, 120, 87, 0.25)",
        margin: "0 0 16px 0",
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            background: "white",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <img
            src="/whatsbro_logo.png"
            alt="SUBI Logo"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "800", color: "white", whiteSpace: "nowrap" }}>
            📲 SUBI e-Sevai
          </h4>
          <p style={{ margin: "2px 0 0 0", fontSize: "0.72rem", opacity: 0.92, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Install app for quick access
          </p>
        </div>
      </div>

      <button
        onClick={handleInstall}
        style={{
          background: "white",
          color: "#047857",
          border: "none",
          borderRadius: "10px",
          padding: "8px 14px",
          fontWeight: "800",
          fontSize: "0.8rem",
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
          boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          transition: "transform 0.15s ease"
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <Download size={15} style={{ strokeWidth: 2.8 }} /> Install App
      </button>
    </div>
  );
}
