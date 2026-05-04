export type StrengthResult = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  suggestions: string[];
};

export function evaluatePassword(pw: string): StrengthResult {
  const suggestions: string[] = [];
  let score = 0;

  if (pw.length >= 8) score++; else suggestions.push("Use at least 8 characters");
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++; else suggestions.push("Mix uppercase and lowercase");
  if (/\d/.test(pw)) score++; else suggestions.push("Add a number");
  if (/[^A-Za-z0-9]/.test(pw)) score++; else suggestions.push("Add a symbol");

  // common password penalty
  const common = ["password", "12345", "qwerty", "letmein", "iloveyou", "admin"];
  if (common.some((c) => pw.toLowerCase().includes(c))) {
    score = Math.max(0, score - 2);
    suggestions.unshift("Avoid common words");
  }

  const final = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];
  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-yellow-500",
    "bg-green-500",
    "bg-green-600",
  ];

  return { score: final, label: labels[final], color: colors[final], suggestions };
}
