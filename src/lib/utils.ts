import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function getStatusBadgeColor(status: string) {
	const s = status.toLowerCase()

	if (s === "completed") {
		return "border-green-600/30 bg-green-600/10 text-green-700"
	}
	if (s === "in progress") {
		return "border-amber-600/30 bg-amber-500/10 text-amber-700"
	}
	if (s === "incomplete") {
		return "border-red-600/30 bg-red-600/10 text-red-700"
	}
	if (s === "uncategorized") {
		return "border-muted-foreground/40 bg-muted text-muted-foreground"
	}

	return "border-muted-foreground/40 bg-muted text-muted-foreground"
}
