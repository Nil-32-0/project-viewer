import ProjectsGallery from "@/components/projects-gallery"
import { getTagColorMap } from "@/lib/config"
import { extractDescriptionFromProject, getProjects } from "@/lib/github"

interface Project {
	name: string
	path: string
	type: string
	tags: string[]
	status: string
}

interface ProjectWithMeta extends Project {
	description: string
	redirectUrl: string | null
}

export const dynamic = "force-dynamic"

export default async function Home() {
	const baseProjects = await getProjects()
	const projectsWithMeta: ProjectWithMeta[] = await Promise.all(
		baseProjects.map(async (project) => {
			const { description, redirectUrl } = await extractDescriptionFromProject(project.path)
			return { ...project, description, redirectUrl }
		}),
	)

	const tagColorByValue = getTagColorMap()

	return (
		<main className="min-h-screen bg-background">
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
				<div className="mb-12 sm:mb-16">
					<h1 className="text-balance text-4xl font-bold sm:text-5xl lg:text-6xl">Projects</h1>
					<p className="max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
						A collection of my projects in various stages of completion. Use the filters below to explore by name, status, or
						technology.
					</p>
				</div>

				<ProjectsGallery projects={projectsWithMeta} tagColorByValue={tagColorByValue} />
			</div>
		</main>
	)
}
