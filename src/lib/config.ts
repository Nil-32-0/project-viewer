import fs from "node:fs"
import path from "node:path"

import { parse } from "yaml"

export type TagCategoryConfig = {
	classes: string
	tags: string[]
}

type StatusStyleConfig = {
	folderClasses?: string
}

export type AppConfig = {
	githubUser: string
	tagCategories: Record<string, TagCategoryConfig>
	statusStyles: Record<string, StatusStyleConfig>
}

const CONFIG_FILE_PATH = path.join(process.cwd(), "config.yaml")
const isProduction = process.env.NODE_ENV === "production"

export const DEFAULT_STATUS_FOLDER_CLASS = "bg-muted text-muted-foreground"
const defaultStatusFolderClasses: Record<string, string> = {
	completed: "bg-green-100 text-green-700",
	"in progress": "bg-amber-100 text-amber-700",
	incomplete: "bg-red-100 text-red-700",
	uncategorized: DEFAULT_STATUS_FOLDER_CLASS,
}

let cachedConfig: AppConfig | null = null
let cachedTagColorMap: Record<string, string> | null = null
let cachedStatusFolderClasses: Record<string, string> | null = null

function loadConfigFromDisk(): AppConfig {
	if (!fs.existsSync(CONFIG_FILE_PATH)) {
		throw new Error(`config.yaml not found at ${CONFIG_FILE_PATH}`)
	}

	const fileContents = fs.readFileSync(CONFIG_FILE_PATH, "utf8")
	const parsed = parse(fileContents) as Partial<AppConfig> | undefined

	if (!parsed || typeof parsed !== "object") {
		throw new Error("config.yaml is empty or invalid")
	}

	const githubUser = parsed.githubUser?.toString().trim()
	if (!githubUser) {
		throw new Error("config.yaml must define a non-empty `githubUser` value")
	}

	const tagCategories = Object.entries(parsed.tagCategories ?? {}).reduce<Record<string, TagCategoryConfig>>(
		(acc, [key, value]) => {
			if (!value || typeof value !== "object") {
				return acc
			}

			const categoryValue = value as Partial<TagCategoryConfig>
			const classes = categoryValue.classes?.toString().trim()
			const tagsInput = categoryValue.tags ?? []
			const tags = Array.isArray(tagsInput)
				? tagsInput
						.map((tag) => tag?.toString().trim())
						.filter((tag): tag is string => Boolean(tag))
				: []

			if (classes && tags.length > 0) {
				acc[key] = { classes, tags }
			}

			return acc
		},
		{},
	)

	const statusStyles = Object.entries(parsed.statusStyles ?? {}).reduce<Record<string, StatusStyleConfig>>(
		(acc, [key, value]) => {
			if (!value || typeof value !== "object") {
				return acc
			}

			const normalizedKey = key.trim().toLowerCase()
			if (!normalizedKey) {
				return acc
			}

			const styleValue = value as StatusStyleConfig
			const folderClasses = styleValue.folderClasses?.toString().trim()

			if (folderClasses) {
				acc[normalizedKey] = { folderClasses }
			}

			return acc
		},
		{},
	)

	return {
		githubUser,
		tagCategories,
		statusStyles,
	}
}

export function getConfig(): AppConfig {
	if (!isProduction) {
		return loadConfigFromDisk()
	}

	if (!cachedConfig) {
		cachedConfig = loadConfigFromDisk()
	}

	return cachedConfig
}

function buildTagColorMap(tagCategories: Record<string, TagCategoryConfig>): Record<string, string> {
	return Object.values(tagCategories).reduce<Record<string, string>>((acc, { classes, tags }) => {
		for (const tag of tags) {
			acc[tag.toLowerCase()] = classes
		}
		return acc
	}, {})
}

export function getTagColorMap(): Record<string, string> {
	if (!isProduction) {
		return buildTagColorMap(getConfig().tagCategories)
	}

	if (!cachedTagColorMap) {
		cachedTagColorMap = buildTagColorMap(getConfig().tagCategories)
	}

	return cachedTagColorMap
}

function buildStatusFolderClassMap(statusStyles: Record<string, StatusStyleConfig>): Record<string, string> {
	const overrides = Object.entries(statusStyles ?? {}).reduce<Record<string, string>>((acc, [key, config]) => {
		if (!config?.folderClasses) return acc
		acc[key] = config.folderClasses
		return acc
	}, {})

	return { ...defaultStatusFolderClasses, ...overrides }
}

export function getStatusFolderClasses(): Record<string, string> {
	if (!isProduction) {
		return buildStatusFolderClassMap(getConfig().statusStyles)
	}

	if (!cachedStatusFolderClasses) {
		cachedStatusFolderClasses = buildStatusFolderClassMap(getConfig().statusStyles)
	}

	return cachedStatusFolderClasses
}

export function getGithubUser(): string {
	const fromEnv = process.env.GITHUB_USER?.trim()
	if (fromEnv) return fromEnv
	return getConfig().githubUser
}
