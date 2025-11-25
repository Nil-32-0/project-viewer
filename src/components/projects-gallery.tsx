"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Folder, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { TagCategoryConfig } from "@/lib/config"
import { cn, getStatusBadgeColor } from "@/lib/utils"

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
	tagColorByValue: Record<string, string>
	tagCategories: Record<string, TagCategoryConfig>
	statusFolderClasses: Record<string, string>
	defaultFolderClass: string
}

type TagFilterGroup = {
	key: string
	label: string
	tags: { value: string; label: string; classes: string }[]
}

function formatCategoryLabel(value: string) {
	return value
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[-_]+/g, " ")
		.replace(/\s+/g, " ")
		.replace(/\b\w/g, (char) => char.toUpperCase())
		.trim()
}

export default function ProjectsGallery({
	projects,
	tagColorByValue,
	tagCategories,
	statusFolderClasses,
	defaultFolderClass,
}: ProjectsGalleryProps) {
	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState<string>("all")
	const [selectedTags, setSelectedTags] = useState<string[]>([])
	const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
	const tagDropdownRef = useRef<HTMLDivElement>(null)

	const statusOptions = useMemo(() => {
		const entries = new Map<string, string>()
		for (const project of projects) {
			const label = project.status ?? "Uncategorized"
			const value = label.toLowerCase()
			if (!entries.has(value)) entries.set(value, label)
		}
		return Array.from(entries, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
	}, [projects])

	const { tagFilterGroups, tagMetadataByValue } = useMemo(() => {
		const labelMap = new Map<string, string>()
		for (const project of projects) {
			for (const tag of project.tags) {
				const normalized = tag.trim().toLowerCase()
				if (!normalized) continue
				if (!labelMap.has(normalized)) {
					labelMap.set(normalized, tag)
				}
			}
		}

		const metadata = new Map<string, { label: string; classes: string }>()
		const consumed = new Set<string>()
		const groups: TagFilterGroup[] = []

		const categoryEntries = Object.entries(tagCategories ?? {})
			.map(([key, config]) => ({
				key,
				label: formatCategoryLabel(key),
				config,
			}))
			.sort((a, b) => a.label.localeCompare(b.label))

		for (const entry of categoryEntries) {
			const tags =
				entry.config.tags
					?.map((tag) => {
						const value = tag.trim().toLowerCase()
						if (!value || !labelMap.has(value)) return null
						const label = labelMap.get(value) ?? tag
						const classes = tagColorByValue[value] ?? entry.config.classes ?? ""
						consumed.add(value)
						metadata.set(value, { label, classes })
						return { value, label, classes }
					})
					.filter((tag): tag is { value: string; label: string; classes: string } => Boolean(tag))
					.sort((a, b) => a.label.localeCompare(b.label)) ?? []

			if (tags.length > 0) {
				groups.push({ key: entry.key, label: entry.label, tags })
			}
		}

		const leftovers: TagFilterGroup["tags"] = []
		for (const [value, label] of labelMap.entries()) {
			if (consumed.has(value)) continue
			const classes = tagColorByValue[value] ?? ""
			metadata.set(value, { label, classes })
			leftovers.push({ value, label, classes })
		}
		if (leftovers.length > 0) {
			leftovers.sort((a, b) => a.label.localeCompare(b.label))
			groups.push({ key: "other", label: "Other", tags: leftovers })
		}

		return { tagFilterGroups: groups, tagMetadataByValue: metadata }
	}, [projects, tagCategories, tagColorByValue])

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

	useEffect(() => {
		if (!isTagDropdownOpen) return

		function handleClickOutside(event: MouseEvent) {
			if (!tagDropdownRef.current) return
			if (!tagDropdownRef.current.contains(event.target as Node)) {
				setIsTagDropdownOpen(false)
			}
		}

		function handleEscape(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsTagDropdownOpen(false)
			}
		}

		document.addEventListener("mousedown", handleClickOutside)
		document.addEventListener("keydown", handleEscape)
		return () => {
			document.removeEventListener("mousedown", handleClickOutside)
			document.removeEventListener("keydown", handleEscape)
		}
	}, [isTagDropdownOpen])

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

	const selectedTagBadges = selectedTags
		.map((value) => {
			const metadata = tagMetadataByValue.get(value)
			if (!metadata) {
				return {
					value,
					label: value,
					classes: "",
				}
			}
			return { value, ...metadata }
		})
		.sort((a, b) => a.label.localeCompare(b.label))

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 rounded-lg border border-border p-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
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
							className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-48 cursor-pointer"
						>
							<option value="all">All</option>
							{statusOptions.map((status) => (
								<option key={status.value} value={status.value}>
									{status.label}
								</option>
							))}
						</select>
					</label>

					{tagFilterGroups.length > 0 && (
						<div className="flex flex-col gap-1 text-sm font-medium text-foreground sm:ml-2">
							<span>Tags</span>
							<div className="relative" ref={tagDropdownRef}>
								<button
									type="button"
									onClick={() => setIsTagDropdownOpen((prev) => !prev)}
									className={cn(
										"flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-56",
										isTagDropdownOpen && "ring-2 ring-ring ring-offset-2",
									)}
									aria-haspopup="listbox"
									aria-expanded={isTagDropdownOpen}
									aria-label="Filter projects by tag"
								>
									<span className="truncate text-muted-foreground">
										{selectedTags.length === 0
											? "All tags"
											: `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selected`}
									</span>
									<ChevronDown
										className={cn(
											"h-4 w-4 transition-transform",
											isTagDropdownOpen ? "rotate-180" : "rotate-0",
										)}
									/>
								</button>
								{isTagDropdownOpen && (
									<div className="absolute right-0 z-20 mt-2 max-h-80 w-64 overflow-y-auto rounded-md border border-border bg-popover p-3 shadow-lg">
										<div className="mb-2 flex justify-between text-xs font-semibold uppercase text-muted-foreground">
											<span>Tag Categories</span>
											{selectedTags.length > 0 && (
												<button
													type="button"
													className="text-xs font-medium text-primary hover:underline"
													onClick={() => setSelectedTags([])}
												>
													Clear
												</button>
											)}
										</div>
										<div className="space-y-3">
											{tagFilterGroups.map((group) => (
												<div key={group.key}>
													<p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
														{group.label}
													</p>
													<div className="flex flex-wrap gap-2">
														{group.tags.map((tag) => {
															const isActive = selectedTags.includes(tag.value)
															return (
																<button
																	key={tag.value}
																	type="button"
																	onClick={() => toggleTag(tag.value)}
																	className={cn(
																		"group flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs transition-colors",
																		isActive
																			? "border-primary/60 bg-primary/5 text-foreground"
																			: "border-transparent text-muted-foreground hover:text-foreground",
																	)}
																>
																	<Badge
																		variant="secondary"
																		className={cn(
																			"pointer-events-none text-xs capitalize",
																			tag.classes,
																		)}
																	>
																		{tag.label}
																	</Badge>
																	{isActive && <Check className="h-3.5 w-3.5 text-primary" />}
																</button>
															)
														})}
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				{selectedTagBadges.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{selectedTagBadges.map((tag) => (
							<Badge
								key={tag.value}
								variant="secondary"
								className={cn("text-xs", tag.classes, "pr-1")}
							>
								{tag.label}
								<button
									type="button"
									className="ml-1 rounded-full p-0.5 text-[10px] text-muted-foreground hover:text-foreground"
									onClick={() => toggleTag(tag.value)}
									aria-label={`Remove ${tag.label}`}
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))}
					</div>
				)}

				{hasActiveFilters && (
					<div className="flex justify-end">
						<Button variant="ghost" onClick={resetFilters}>
							Clear filters
						</Button>
					</div>
				)}
			</div>

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
										<div
											className={`rounded-lg p-2 ${
												statusFolderClasses[project.status?.toLowerCase() ?? "uncategorized"] ?? defaultFolderClass
											}`}
										>
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
													className={cn("text-xs", tagColorByValue[tag.toLowerCase()] ?? "")
}
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
