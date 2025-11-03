interface ProjectFile {
	name: string
	path: string
	type: string
	download_url: string | null
}

interface ProjectWithTags {
	name: string
	path: string
	type: string
	tags: string[]
	status: string
}

const STATUS_DIRS = ["Completed", "In Progress", "Incomplete"]

export async function getProjects(): Promise<ProjectWithTags[]> {
	try {
		const response = await fetch("https://api.github.com/repos/rileybarshak/projects/contents", {
			headers: {
				Accept: "application/vnd.github.v3+json",
			},
			next: { revalidate: 3600 },
		})

		if (!response.ok) {
			throw new Error("Failed to fetch projects")
		}

		const data = await response.json()
		const directories = data.filter((item: any) => item.type === "dir")
		const statusRoots = directories.filter((dir: any) => STATUS_DIRS.includes(dir.name))

		if (statusRoots.length === 0) {
			// Fallback for legacy structure where projects live at repo root
			return Promise.all(
				directories.map(async (dir: any) => {
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

		for (const statusDir of statusRoots) {
			const statusName: string = statusDir.name
			const statusPath = encodeURIComponent(statusName)
			const subResp = await fetch(
				`https://api.github.com/repos/rileybarshak/projects/contents/${statusPath}`,
				{
					headers: { Accept: "application/vnd.github.v3+json" },
					next: { revalidate: 3600 },
				},
			)
			if (!subResp.ok) continue
			const subDirs = (await subResp.json()).filter((item: any) => item.type === "dir")
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
			const nonStatusDirs = directories.filter((dir: any) => !STATUS_DIRS.includes(dir.name))
			if (nonStatusDirs.length > 0) {
				return Promise.all(
					nonStatusDirs.map(async (dir: any) => {
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
		`https://api.github.com/repos/rileybarshak/projects/contents/${encodePath(nameOrPath)}`,
		{ headers: { Accept: "application/vnd.github.v3+json" }, next: { revalidate: 3600 } },
	)
	if (directResponse.ok) return nameOrPath

	for (const status of STATUS_DIRS) {
		const tryPath = `${status}/${nameOrPath}`
		const response = await fetch(
			`https://api.github.com/repos/rileybarshak/projects/contents/${encodePath(tryPath)}`,
			{ headers: { Accept: "application/vnd.github.v3+json" }, next: { revalidate: 3600 } },
		)
		if (response.ok) return tryPath
	}
	return null
}

export async function extractDescriptionFromProject(projectName: string): Promise<string> {
	try {
		const projectPath = await resolveProjectPath(projectName)
		if (!projectPath) return ""
		//Fetch project files
		const response = await fetch(
			`https://api.github.com/repos/rileybarshak/projects/contents/${encodePath(projectPath)}`,
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
				},
				next: { revalidate: 3600 },
			},
		)

		if (!response.ok) {
			return ""
		}

		const files: ProjectFile[] = await response.json()
		const markdownFile = files.find((file) => file.name.toLowerCase().endsWith(".md") && file.download_url)

		if (!markdownFile || !markdownFile.download_url) {
			return ""
		}

		//Fetch markdown content
		const contentResponse = await fetch(markdownFile.download_url, {
			next: { revalidate: 3600 },
		})

		if (!contentResponse.ok) {
			return ""
		}

		const content = await contentResponse.text()
		const lines = content.split("\n")

		//check line 3 (index 2) for description
		if (lines.length >= 3) {
			const line3 = lines[2]
			//Match pattern: **Project Description:** Description
			const match = line3.match(/\*\*Project?\s*Description?:\*\*\s*(.+)/i)
			if (match) {
				const desc = match[1]
				return desc
			}

		}

		return ""
	} catch (error) {
		console.error(`Error extracting tags for ${projectName}:`, error)
		return ""
	}
}


export async function extractTagsFromProject(projectName: string): Promise<string[]> {
	try {
		const projectPath = await resolveProjectPath(projectName)
		if (!projectPath) return []
		//Fetch project files
		const response = await fetch(
			`https://api.github.com/repos/rileybarshak/projects/contents/${encodePath(projectPath)}`,
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
				},
				next: { revalidate: 3600 },
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
			next: { revalidate: 3600 },
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
			`https://api.github.com/repos/rileybarshak/projects/contents/${encodePath(projectPath)}`,
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
				},
				next: { revalidate: 3600 },
			},
		)

		if (!response.ok) {
			return []
		}

		return await response.json()
	} catch (error) {
		console.error("Error fetching project files:", error)
		return []
	}
}

export async function getFileContent(url: string): Promise<string> {
	try {
		const response = await fetch(url, {
			next: { revalidate: 3600 },
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
