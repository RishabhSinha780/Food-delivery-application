import { evaluatePassword } from "@/lib/passwordStrength";
import { cn } from "@/lib/utils";

export default function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color, suggestions } = evaluatePassword(password);
  const segments = 4;
  const filled = Math.max(1, score);

  return (
    <div className="mt-2 space-y-1.5" aria-live="polite">
      <div className="flex gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < filled ? color : "bg-muted",
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        {suggestions[0] && (
          <span className="text-muted-foreground">{suggestions[0]}</span>
        )}
      </div>
    </div>
  );
}
