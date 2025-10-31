import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Folder } from "lucide-react"
import { getProjects as fetchProjects } from "@/lib/github"

interface Project {
	name: string
	path: string
	type: string
	tags: string[] // Assuming tags are added to the Project interface
}

export default async function Home() {
	const projects = await fetchProjects()

	return (
		<main className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
				{/* Header */}
				<div className="mb-12 sm:mb-16">
					<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-balance">Projects</h1>
					<p className="text-lg sm:text-xl text-muted-foreground max-w-2xl text-pretty">
						A collection of projects from my GitHub repository. Click on any project to explore its documentation and
						resources.
					</p>
				</div>

				{/* Projects Grid */}
				{projects.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-muted-foreground">No projects found.</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{projects.map((project) => (
							<Link key={project.path} href={`/project/${encodeURIComponent(project.name)}`} className="group">
								<Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-lg">
									<CardHeader>
										<div className="flex items-start justify-between mb-2">
											<div className="p-2 rounded-lg bg-muted">
												<Folder className="h-6 w-6 text-muted-foreground" />
											</div>
											<ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
										</div>
										<CardTitle className="text-xl">{project.name}</CardTitle>
										<CardDescription>View project documentation and resources</CardDescription>
									</CardHeader>
									<CardContent>
										{project.tags.length > 0 && (
											<div className="flex flex-wrap gap-2">
												{project.tags.map((tag, index) => (
													<Badge key={index} variant="secondary" className="text-xs">
														{tag}
													</Badge>
												))}
											</div>
										)}
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				)}
			</div>
		</main>
	)
}
