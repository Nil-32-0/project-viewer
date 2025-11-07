"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Folder } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, getBadgeColor, getFolderColor, getStatusBadgeColor } from "@/lib/utils"

type ProjectCard = {
	name: string
	path: string
	type: string
	tags: string[]
	status: string
	description: string
	redirectUrl: string | null
}

interface ProjectsGalleryProps {
	projects: ProjectCard[]
}

export default function ProjectsGallery({ projects }: ProjectsGalleryProps) {
	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState<string>("all")
	const [selectedTags, setSelectedTags] = useState<string[]>([])

	const statusOptions = useMemo(() => {
		const entries = new Map<string, string>()
		for (const project of projects) {
			const label = project.status ?? "Uncategorized"
			const value = label.toLowerCase()
			if (!entries.has(value)) entries.set(value, label)
		}
		return Array.from(entries, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
	}, [projects])

	const tagOptions = useMemo(() => {
		const entries = new Map<string, string>()
		for (const project of projects) {
			for (const tag of project.tags) {
				const value = tag.toLowerCase()
				if (!entries.has(value)) entries.set(value, tag)
			}
		}
		return Array.from(entries, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
	}, [projects])

	const filteredProjects = useMemo(() => {
		const term = searchTerm.trim().toLowerCase()
		return projects.filter((project) => {
			const matchesName = project.name.toLowerCase().includes(term)
			const projectStatus = project.status?.toLowerCase() ?? "uncategorized"
			const matchesStatus = statusFilter === "all" || projectStatus === statusFilter

			const normalizedTags = project.tags.map((tag) => tag.toLowerCase())
			const matchesTags =
				selectedTags.length === 0 || selectedTags.every((tag) => normalizedTags.includes(tag))

			return matchesName && matchesStatus && matchesTags
		})
	}, [projects, searchTerm, statusFilter, selectedTags])

	const hasActiveFilters =
		searchTerm.trim().length > 0 || statusFilter !== "all" || selectedTags.length > 0

	function toggleTag(tagValue: string) {
		setSelectedTags((current) =>
			current.includes(tagValue) ? current.filter((value) => value !== tagValue) : [...current, tagValue],
		)
	}

	function resetFilters() {
		setSearchTerm("")
		setStatusFilter("all")
		setSelectedTags([])
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
					<label className="flex flex-col gap-1 text-sm font-medium text-foreground">
						Search
						<input
							type="search"
							value={searchTerm}
							onChange={(event) => setSearchTerm(event.target.value)}
							placeholder="Search by project name…"
							className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-64"
						/>
					</label>

					<label className="flex flex-col gap-1 text-sm font-medium text-foreground sm:ml-2">
						Status
						<select
							value={statusFilter}
							onChange={(event) => setStatusFilter(event.target.value)}
							className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-48"
						>
							<option value="all">All</option>
							{statusOptions.map((status) => (
								<option key={status.value} value={status.value}>
									{status.label}
								</option>
							))}
						</select>
					</label>
				</div>

				{hasActiveFilters && (
					<Button variant="ghost" onClick={resetFilters} className="self-start sm:self-center">
						Clear filters
					</Button>
				)}
			</div>

			{tagOptions.length > 0 && (
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm font-medium text-muted-foreground">Languages & Technologies:</span>
					{tagOptions.map((tag) => {
						const isActive = selectedTags.includes(tag.value)
						return (
							<button
								key={tag.value}
								type="button"
								onClick={() => toggleTag(tag.value)}
								className={cn(
									"rounded-full border px-3 py-1 text-sm transition-colors",
									isActive
										? "border-primary bg-primary/10 text-primary"
										: "border-border bg-background text-muted-foreground hover:text-foreground",
								)}
							>
								{tag.label}
							</button>
						)
					})}
				</div>
			)}

			{filteredProjects.length === 0 ? (
				<div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
					No projects match your filters.
				</div>
			) : (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{filteredProjects.map((project) => {
						const card = (
							<Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-lg">
								<CardHeader>
									<div className="mb-2 flex items-start justify-between">
										<div className={`rounded-lg p-2 ${getFolderColor(project.status)}`}>
											<Folder className="h-6 w-6" />
										</div>
										<Badge
											variant="outline"
											className={cn("capitalize", getStatusBadgeColor(project.status))}
										>
											{project.status}
										</Badge>
									</div>
									<CardTitle className="text-xl">{project.name}</CardTitle>
									{project.description && <CardDescription>{project.description}</CardDescription>}
								</CardHeader>
								<CardContent>
									{project.tags.length > 0 && (
										<div className="flex flex-wrap gap-2">
											{project.tags.map((tag, index) => (
												<Badge
													key={`${project.path}-${tag}-${index}`}
													variant="secondary"
													className={getBadgeColor(tag)}
												>
													{tag}
												</Badge>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						)

						return project.redirectUrl ? (
							<a
								key={project.path}
								href={project.redirectUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="group block"
							>
								{card}
							</a>
						) : (
							<Link key={project.path} href={`/project/${encodeURIComponent(project.path)}`} className="group block">
								{card}
							</Link>
						)
					})}
				</div>
			)}
		</div>
	)
}