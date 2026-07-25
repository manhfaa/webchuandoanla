"use client";

import { useEffect, useRef, useState } from "react";

import { useTr } from "@/lib/use-tr";

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "rectangular" | "pill" | "circle" | "square";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              width?: number;
              locale?: string;
            },
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

/**
 * Reports whether Google sign-in can actually work: the browser needs a client
 * id and the server needs a matching one. Without the server check the page
 * rendered a button that always failed.
 */
export function useGoogleSignInAvailability() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [serverReady, setServerReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    fetch("/api/django/api/auth/google/")
      .then((res) => (res.ok ? res.json() : { configured: false }))
      .then((data: { configured?: boolean }) => {
        if (active) setServerReady(Boolean(data.configured));
      })
      .catch(() => {
        if (active) setServerReady(false);
      });
    return () => {
      active = false;
    };
  }, [clientId]);

  return { clientId, available: Boolean(clientId) && serverReady === true };
}

interface GoogleSignInButtonProps {
  clientId: string;
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
  text?: "continue_with" | "signup_with" | "signin_with";
}

export function GoogleSignInButton({ clientId, onCredential, onError, text = "continue_with" }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  // Kept in a ref so re-renders caused by the parent's state do not tear down
  // and re-mount Google's iframe mid-flow.
  const handlersRef = useRef({ onCredential, onError });

  useEffect(() => {
    handlersRef.current = { onCredential, onError };
  }, [onCredential, onError]);

  useEffect(() => {
    const buttonElement = buttonRef.current;
    if (!buttonElement) return;

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-google-identity]");

    const initializeGoogle = () => {
      if (!window.google) return;
      buttonElement.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        use_fedcm_for_prompt: true,
        callback: (response) => {
          if (!response.credential) {
            handlersRef.current.onError("Google chưa xác nhận được tài khoản. Vui lòng thử lại.");
            return;
          }
          handlersRef.current.onCredential(response.credential);
        },
      });
      window.google.accounts.id.renderButton(buttonElement, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text,
        width: Math.min(420, buttonElement.clientWidth || 420),
        locale: "vi",
      });
    };

    if (existingScript) {
      if (window.google) initializeGoogle();
      else existingScript.addEventListener("load", initializeGoogle, { once: true });
      return () => existingScript.removeEventListener("load", initializeGoogle);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = initializeGoogle;
    script.onerror = () =>
      handlersRef.current.onError("Chưa thể mở đăng nhập Google. Vui lòng dùng email hoặc thử lại sau.");
    document.head.appendChild(script);

    return () => window.google?.accounts.id.cancel();
  }, [clientId, text]);

  return <div ref={buttonRef} className="mt-3 min-h-11 w-full overflow-hidden rounded-md" />;
}

export function AuthDivider() {
  const tr = useTr();
  return (
    <div className="mt-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
      <span className="h-px flex-1 bg-line" aria-hidden />
      {tr("Hoặc dùng email", "Or use email")}
      <span className="h-px flex-1 bg-line" aria-hidden />
    </div>
  );
}
