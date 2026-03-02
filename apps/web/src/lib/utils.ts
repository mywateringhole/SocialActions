import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-GB").format(num);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "high":
      return "text-red-600 bg-red-50 border-red-200";
    case "medium":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "low":
      return "text-blue-600 bg-blue-50 border-blue-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

export function anomalyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    spending_spike: "Spending Spike",
    supplier_concentration: "Supplier Concentration",
    new_large_supplier: "New Large Supplier",
    round_numbers: "Round Numbers",
    year_end_surge: "Year-End Surge",
    split_transactions: "Split Transactions",
    unusual_expense: "Unusual Expense",
    duplicate_payment: "Duplicate Payment",
  };
  return labels[type] ?? type;
}
