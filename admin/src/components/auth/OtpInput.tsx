import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Loader2,
} from "lucide-react";

// Stable keys for the fixed 6-digit OTP input fields
const OTP_KEYS = ["d1", "d2", "d3", "d4", "d5", "d6"] as const;

interface OtpInputProps {
  onSubmit: (code: string) => void;
  onResend: () => void;
  isLoading: boolean;
  error: string | null;
  email: string;
  className?: string;
  expiresAt?: string; // ISO string from backend
  isSuccess?: boolean; // Success state from parent
}

export default function OtpInput({
  onSubmit,
  onResend,
  isLoading,
  error,
  email,
  className,
  expiresAt,
  isSuccess = false,
}: OtpInputProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  // Calculate initial time left based on backend expiration or default to 5 minutes
  const getInitialTimeLeft = () => {
    if (expiresAt) {
      const expirationTime = new Date(expiresAt).getTime();
      const currentTime = new Date().getTime();
      const secondsLeft = Math.max(
        0,
        Math.floor((expirationTime - currentTime) / 1000),
      );
      return secondsLeft;
    }
    return 300; // Default 5 minutes
  };

  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Derive resend disabled from timeLeft (enabled after 1 minute = when timeLeft <= 240)
  const isResendDisabled = timeLeft > 240;
  const isExpired = timeLeft <= 0;

  // Timer countdown logic
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Update time left when expiresAt changes (e.g., after resend)
  useEffect(() => {
    if (expiresAt) {
      setTimeLeft(getInitialTimeLeft());
    }
  }, [expiresAt]);

  // Handle input changes with validation and auto-focus
  const handleInputChange = (index: number, value: string) => {
    // Only allow numeric input
    if (!/^\d*$/.test(value)) return;

    // Limit to single digit
    const digit = value.slice(-1);

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-focus next input if digit entered
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered (only if code hasn't expired)
    if (newCode.every((d) => d !== "") && newCode.join("").length === 6) {
      if (!isExpired) {
        onSubmit(newCode.join(""));
      }
    }
  };

  // Handle keyboard navigation and special keys
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Backspace navigation
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Arrow key navigation
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }

    // Home/End navigation
    if (e.key === "Home") {
      e.preventDefault();
      inputRefs.current[0]?.focus();
    }
    if (e.key === "End") {
      e.preventDefault();
      inputRefs.current[5]?.focus();
    }

    // Handle paste
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard
        .readText()
        .then((text) => {
          const digits = text.replace(/\D/g, "").slice(0, 6);
          if (digits.length === 6) {
            const newCode = digits.split("");
            setCode(newCode);
            if (!isExpired) {
              onSubmit(digits);
            }
          }
        })
        .catch(() => {
          // Ignore clipboard errors
        });
    }
  };

  // Handle paste event directly on inputs
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const digits = pastedData.replace(/\D/g, "").slice(0, 6);

    if (digits.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < Math.min(digits.length, 6); i++) {
        newCode[i] = digits[i];
      }
      setCode(newCode);

      // Focus the next empty field or submit if complete
      if (digits.length === 6) {
        if (!isExpired) {
          onSubmit(digits);
        }
      } else {
        const nextEmptyIndex = newCode.findIndex(
          (digit, idx) => idx >= digits.length && !digit,
        );
        if (nextEmptyIndex !== -1) {
          inputRefs.current[nextEmptyIndex]?.focus();
        }
      }
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle resend with timer reset
  const handleResend = async () => {
    try {
      await onResend();
      setTimeLeft(300); // Reset to 5 minutes
      setCode(["", "", "", "", "", ""]); // Clear current code
      inputRefs.current[0]?.focus(); // Focus first input
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  // Clear code on new error using a ref to detect changes
  const prevErrorRef = useRef(error);
  if (error && error !== prevErrorRef.current) {
    prevErrorRef.current = error;
    // Reset code synchronously during render
    if (code.some((d) => d !== "")) {
      setCode(["", "", "", "", "", ""]);
      // Schedule focus for after render
      queueMicrotask(() => inputRefs.current[0]?.focus());
    }
  }
  if (!error && prevErrorRef.current) {
    prevErrorRef.current = null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Verificación de Seguridad
        </h1>
        <p className="text-sm text-muted-foreground">
          Hemos enviado un código de 6 dígitos a{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      {/* OTP Input Fields */}
      <div className="flex justify-center space-x-2 sm:space-x-3">
        {code.map((digit, index) => (
          <Input
            key={OTP_KEYS[index]}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleInputChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={cn(
              "h-12 w-12 text-center text-xl font-bold transition-all",
              error
                ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20"
                : isSuccess
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "focus-visible:border-primary focus-visible:ring-primary/20",
              (isLoading || isSuccess) && "opacity-50 cursor-not-allowed",
            )}
            disabled={isLoading || isSuccess}
            aria-label={`Dígito ${index + 1} del código OTP`}
          />
        ))}
      </div>

      {/* Success Message */}
      {isSuccess && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle2 className="h-4 w-4 animate-pulse" />
            ¡Código verificado correctamente!
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && !isSuccess && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4" />
            {isExpired
              ? "El código ha expirado. Solicita un nuevo código."
              : error}
          </div>
        </div>
      )}

      {/* Timer and Resend */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock
            className={cn(
              "h-4 w-4",
              timeLeft <= 60 ? "text-red-600" : "text-muted-foreground",
            )}
          />
          <span>
            Código válido por:{" "}
            <span
              className={cn(
                "font-semibold transition-colors",
                timeLeft <= 30
                  ? "text-red-600"
                  : timeLeft <= 60
                    ? "text-orange-600"
                    : "text-foreground",
              )}
            >
              {formatTime(timeLeft)}
            </span>
          </span>
          {timeLeft <= 30 && (
            <AlertCircle className="h-4 w-4 text-red-600 animate-pulse" />
          )}
        </div>

        {timeLeft > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={isResendDisabled || isLoading}
            className="text-primary hover:text-primary/80"
          >
            {isResendDisabled ? (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Reenviar disponible en{" "}
                {(() => {
                  // Resend is enabled when 60 seconds have passed (timeLeft = 240)
                  // Current seconds passed = 300 - timeLeft
                  // Seconds until resend = 60 - (300 - timeLeft) = timeLeft - 240
                  const secondsUntilResend = timeLeft - 240;

                  if (secondsUntilResend <= 0) {
                    return "disponible ahora";
                  } else {
                    return `${secondsUntilResend} segundos`;
                  }
                })()}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reenviar código
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-red-600 font-medium">
              <AlertCircle className="mr-1 inline h-4 w-4" />
              El código ha expirado
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Solicitar nuevo código
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {(isLoading || isSuccess) && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            {isSuccess ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                Redirigiendo...
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Verificando código...
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
