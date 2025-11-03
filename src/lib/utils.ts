import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}


export function getBadgeColor(tag: string) {
	const t = tag.toLowerCase()

	if (["python", "typescript", "javascript", "java", "go"].includes(t)) //Languages
		return "bg-green-200 text-green-700"
	if (["react", "next.js", "tailwind css"].includes(t)) //Frameworks & Libraries
		return "bg-blue-200 text-blue-700"
	if (["docker", "git", "kubernetes"].includes(t)) //DevOps
		return "bg-amber-200 text-amber-700"
	if (["mongodb", "sql", "postgresql"].includes(t)) //Databases
		return "bg-purple-200 text-purple-700"
	if (["3d modeling", "3d printing", "cad", "arduino", "electrical systems", "embedded systems"].includes(t)) //Hardware & Engineering 
		return "bg-rose-200 text-rose-700"

	return "text-xs"
}

export function getFolderColor(status: string) {
	const f = status.toLowerCase()

	if (f === "completed") {
		return "bg-green-100 text-green-700"
	}
	if (f === "in progress") {
		return "bg-amber-100 text-amber-700"
	}
	if (f === "incomplete") {
		return "bg-red-100 text-red-700"
	}
	if (f === "uncategorized") {
		return "bg-muted text-muted-foreground"
	}
	return "bg-muted text-muted-foreground"
}
