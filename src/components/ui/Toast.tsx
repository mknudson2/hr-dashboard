import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";

interface ToastProps {
    id?: string;
    message: string;
    type?: "success" | "error" | "info" | "loading" | "progress";
    show: boolean;
    progress?: number;
    onDismiss?: () => void;
}

export default function Toast({
    message,
    type = "success",
    show,
    progress = 0,
    onDismiss,
}: ToastProps) {
    const bg =
        type === "success"
            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-800"
            : type === "error"
                ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-800"
                : type === "info"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800"
                    : type === "progress" || type === "loading"
                        ? "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700"
                        : "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700";

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    layout
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className={`px-4 py-2 rounded-lg border shadow-md flex flex-col gap-1 ${bg}`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            {type === "loading" && (
                                <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-300" />
                            )}
                            <p className="text-sm font-medium">{message}</p>
                        </div>
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
                                aria-label="Dismiss toast"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {type === "progress" && (
                        <div className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                            <motion.div
                                className="h-1 bg-blue-600 dark:bg-blue-400"
                                initial={{ width: "0%" }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.2 }}
                            />
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
