import { getGithubUser } from "@/lib/config"

type GitHubContentType = "file" | "dir"

interface ProjectFile {
	name: string
	path: string
	type: GitHubContentType
	download_url: string | null
}

interface ProjectWithTags {
	name: string
	path: string
	type: GitHubContentType
	tags: string[]
	status: StatusFolder | "Uncategorized"
}

interface ProjectDescription {
	description: string
	redirectUrl: string | null
}

const cacheTime = 60 //cache time in seconds

const GITHUB_USER = getGithubUser()

const STATUS_DIRS = ["Completed", "In Progress", "Incomplete"] as const
const STATUS_LOOKUP = new Map(STATUS_DIRS.map((status) => [status.toLowerCase(), status] as const))

type StatusFolder = typeof STATUS_DIRS[number]
type DirectoryEntry = ProjectFile & { type: "dir" }

function isDirectory(item: ProjectFile): item is DirectoryEntry {
	return item.type === "dir"
}

function getCanonicalStatus(name: string): StatusFolder | undefined {
	return STATUS_LOOKUP.get(name.toLowerCase())
}

function partitionStatusDirectories(directories: DirectoryEntry[]) {
	const statusDirs: Array<{ entry: DirectoryEntry; status: StatusFolder }> = []
	const otherDirs: DirectoryEntry[] = []

	for (const dir of directories) {
		const status = getCanonicalStatus(dir.name)
		if (status) {
			statusDirs.push({ entry: dir, status })
		} else {
			otherDirs.push(dir)
		}
	}

	return { statusDirs, otherDirs }
}

export async function getProjects(): Promise<ProjectWithTags[]> {
	try {
		const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/projects/contents`, {
			headers: {
				Accept: "application/vnd.github.v3+json",
			},
			next: { revalidate: cacheTime },
		})

		if (!response.ok) {
			throw new Error("Failed to fetch projects")
		}

		const data: ProjectFile[] = await response.json()
		const directories = data.filter(isDirectory)
		const { statusDirs, otherDirs } = partitionStatusDirectories(directories)

		if (statusDirs.length === 0) {
			//Fallback for legacy structure where projects live at repo root
			return Promise.all(
				directories.map(async (dir) => {
					const tags = await extractTagsFromProject(dir.name)
					return {
						name: dir.name,
						path: dir.name,
						type: dir.type,
						tags,
						status: "Uncategorized",
					}
				}),
			)
		}

		const projectsWithTags: ProjectWithTags[] = []

		for (const { entry: statusDir, status: statusName } of statusDirs) {
			const statusPath = encodePath(statusDir.path)
			const subResp = await fetch(
				`https://api.github.com/repos/${GITHUB_USER}/projects/contents/${statusPath}`,
				{
					headers: { Accept: "application/vnd.github.v3+json" },
					next: { revalidate: cacheTime },
				},
			)
			if (!subResp.ok) continue
			const subData: ProjectFile[] = await subResp.json()
			const subDirs = subData.filter(isDirectory)
			for (const sub of subDirs) {
				const name: string = sub.name
				const path: string = `${statusName}/${name}`
				const tags = await extractTagsFromProject(path)
				projectsWithTags.push({
					name,
					path,
					type: sub.type,
					tags,
					status: statusName,
				})
			}
		}


		if (projectsWithTags.length === 0) {
			if (otherDirs.length > 0) {
				return Promise.all(
					otherDirs.map(async (dir) => {
						const tags = await extractTagsFromProject(dir.name)
						return {
							name: dir.name,
							path: dir.name,
							type: dir.type,
							tags,
							status: "Uncategorized",
						}
					}),
				)
			}
		}

		return projectsWithTags
	} catch (error) {
		console.error("Error fetching projects:", error)
		return []
	}
}

function pathHasSlash(nameOrPath: string) {
	return nameOrPath.includes("/")
}

function encodePath(path: string) {
	return path
		.split("/")
		.map((seg) => encodeURIComponent(seg))
		.join("/")
}

export async function resolveProjectPath(nameOrPath: string): Promise<string | null> {
	if (pathHasSlash(nameOrPath)) return nameOrPath

	const directResponse = await fetch(
		`https://api.github.com/repos/${GITHUB_USER}/projects/contents/${encodePath(nameOrPath)}`,
		{ headers: { Accept: "application/vnd.github.v3+json" }, next: { revalidate: cacheTime } },
	)
	if (directResponse.ok) return nameOrPath

	for (const status of STATUS_DIRS) {
		const tryPath = `${status}/${nameOrPath}`
		const response = await fetch(
			`https://api.github.com/repos/${GITHUB_USER}/projects/contents/${encodePath(tryPath)}`,
			{ headers: { Accept: "application/vnd.github.v3+json" }, next: { revalidate: cacheTime } },
		)
		if (response.ok) return tryPath
	}
	return null
}

export async function extractDescriptionFromProject(projectName: string): Promise<ProjectDescription> {
	try {
		const projectPath = await resolveProjectPath(projectName)
		if (!projectPath) return { description: "", redirectUrl: null }
		//Fetch project files
		const response = await fetch(
			`https://api.github.com/repos/${GITHUB_USER}/projects/contents/${encodePath(projectPath)}`,
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
				},
				next: { revalidate: cacheTime },
			},
		)

		if (!response.ok) {
			return { description: "", redirectUrl: null }
		}

		const files: ProjectFile[] = await response.json()
		const markdownFile = files.find((file) => file.name.toLowerCase().endsWith(".md") && file.download_url)

		if (!markdownFile || !markdownFile.download_url) {
			return { description: "", redirectUrl: null }
		}

		//Fetch markdown content
		const contentResponse = await fetch(markdownFile.download_url, {
			next: { revalidate: cacheTime },
		})

		if (!contentResponse.ok) {
			return { description: "", redirectUrl: null }
		}

		const content = await contentResponse.text()
		const lines = content.split("\n")
		const firstNonEmptyLine = lines.find((line) => line.trim().length > 0) ?? ""
		let redirectUrl: string | null = null
		const linkMatch = firstNonEmptyLine.match(/^\s*#\s*\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/i)
		if (linkMatch) {
			redirectUrl = linkMatch[1]
		}

		//check line 3 (index 2) for description
		let desc = ""
		if (lines.length >= 3) {
			const line3 = lines[2]
			//Match pattern: **Project Description:** Description
			const match = line3.match(/\*\*Project?\s*Description?:\*\*\s*(.+)/i)
			if (match) {
				desc = match[1].trim()
			}

		}

		return { description: desc, redirectUrl }
	} catch (error) {
		console.error(`Error extracting project description for ${projectName}:`, error)
		return { description: "", redirectUrl: null }
	}
}


export async function extractTagsFromProject(projectName: string): Promise<string[]> {
	try {
		const projectPath = await resolveProjectPath(projectName)
		if (!projectPath) return []
		//Fetch project files
		const response = await fetch(
			`https://api.github.com/repos/${GITHUB_USER}/projects/contents/${encodePath(projectPath)}`,
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
				},
				next: { revalidate: cacheTime }, 
			},
		)

		if (!response.ok) {
			return []
		}

		const files: ProjectFile[] = await response.json()
		const markdownFile = files.find((file) => file.name.toLowerCase().endsWith(".md") && file.download_url)

		if (!markdownFile || !markdownFile.download_url) {
			return []
		}

		//Fetch markdown content
		const contentResponse = await fetch(markdownFile.download_url, {
			next: { revalidate: cacheTime },
		})

		if (!contentResponse.ok) {
			return []
		}

		const content = await contentResponse.text()
		const lines = content.split("\n")

		//Check line 5 (index 4) for tags
		if (lines.length >= 5) {
			const line4 = lines[4]
			//Match pattern: **Languages & Technologies:** Next.js, React, TypeScript, Tailwind CSS
			const match = line4.match(/\*\*Languages?\s*&\s*Technologies?:\*\*\s*(.+)/i)
			if (match) {
				const tagsString = match[1]
				//Split by comma and clean up
				return tagsString
					.split(",")
					.map((tag) => tag.trim())
					.filter((tag) => tag.length > 0)
			}
		}

		return []
	} catch (error) {
		console.error(`Error extracting tags for ${projectName}:`, error)
		return []
	}
}

export async function getProjectFiles(projectName: string): Promise<ProjectFile[]> {
	try {
		const projectPath = await resolveProjectPath(projectName)
		if (!projectPath) return []
		const response = await fetch(
			`https://api.github.com/repos/${GITHUB_USER}/projects/contents/${encodePath(projectPath)}`,
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
				},
				next: { revalidate: cacheTime },
			},
		)

		if (!response.ok) {
			return []
		}

		const files: ProjectFile[] = await response.json()
		return files
	} catch (error) {
		console.error("Error fetching project files:", error)
		return []
	}
}

export async function getFileContent(url: string): Promise<string> {
	try {
		const response = await fetch(url, {
			next: { revalidate: cacheTime },
		})

		if (!response.ok) {
			return ""
		}

		return await response.text()
	} catch (error) {
		console.error("Error fetching file content:", error)
		return ""
	}
}
