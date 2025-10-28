import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import Toast from "@/components/ui/Toast";

type ToastType = "success" | "error" | "info" | "loading" | "progress";

interface ToastData {
    id: string;
    message: string;
    type: ToastType;
    progress?: number;
}

interface ToastContextProps {
    showToast: (message: string, type?: ToastType, progress?: number) => string;
    updateToast: (id: string, message: string, type?: ToastType, progress?: number) => void;
    hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const showToast = (
        message: string,
        type: ToastType = "success",
        progress?: number
    ): string => {
        const id = crypto.randomUUID();
        const newToast = { id, message, type, progress };
        setToasts((prev) => [...prev, newToast]);

        // Automatically remove after 3s for non-loading/non-progress types
        if (type !== "loading" && type !== "progress") {
            setTimeout(() => hideToast(id), 3000);
        }

        return id;
    };

    const updateToast = (
        id: string,
        message: string,
        type: ToastType = "success",
        progress?: number
    ) => {
        setToasts((prev) =>
            prev.map((t) => {
                // Automatically convert to success when progress hits 100%
                if (t.id === id && type === "progress" && progress === 100) {
                    setTimeout(() => hideToast(id), 3000);
                    return { ...t, message: "✅ Completed successfully!", type: "success", progress: 100 };
                }
                return t.id === id ? { ...t, message, type, progress: progress ?? t.progress } : t;
            })
        );

        if (type !== "loading" && type !== "progress") {
            setTimeout(() => hideToast(id), 3000);
        }
    };

    const hideToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    // Keyboard dismissal (Esc)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && toasts.length > 0) {
                hideToast(toasts[toasts.length - 1].id);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toasts]);

    return (
        <ToastContext.Provider value={{ showToast, updateToast, hideToast }}>
            {children}

            {/* Stacked Toasts */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        id={toast.id}
                        message={toast.message}
                        type={toast.type}
                        progress={toast.progress}
                        show={true}
                        onDismiss={() => hideToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextProps {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
