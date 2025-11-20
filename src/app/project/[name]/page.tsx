//app/project/[name]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import { getProjectFiles, getFileContent, extractTagsFromProject, resolveProjectPath } from "@/lib/github"
import { cn } from "@/lib/utils"
import { getGithubUser, getTagColorMap } from "@/lib/config"

const tagColorByValue = getTagColorMap()
const githubUser = getGithubUser()

function encodePath(path: string) {
	return path
		.split("/")
		.map((seg) => encodeURIComponent(seg))
		.join("/")
}

function buildRawBaseUrl(projectPath: string) {
	const encoded = encodePath(projectPath)
	const suffix = encoded.length > 0 ? `${encoded}/` : ""
	return `https://raw.githubusercontent.com/${githubUser}/projects/HEAD/${suffix}`
}

function buildRepoBaseUrl(projectPath: string) {
	const encoded = encodePath(projectPath)
	const suffix = encoded.length > 0 ? `${encoded}/` : ""
	return `https://github.com/${githubUser}/projects/blob/HEAD/${suffix}`
}

function resolveAssetUrl(projectPath: string, url?: string) {
	if (!url) return ""
	if (/^(?:https?:|data:)/i.test(url)) return url
	try {
		return new URL(url, buildRawBaseUrl(projectPath)).toString()
	} catch {
		return ""
	}
}

function resolvePageUrl(projectPath: string, href?: string) {
	if (!href) return "#"
	if (/^(?:https?:|mailto:|tel:)/i.test(href) || href.startsWith("#")) return href
	try {
		return new URL(href, buildRepoBaseUrl(projectPath)).toString()
	} catch {
		return href
	}
}

export default async function ProjectPage({
	params,
}: {
	params: Promise<{ name: string }>
}) {
	const { name } = await params
	const decodedSlug = decodeURIComponent(name)

	const resolvedPath = await resolveProjectPath(decodedSlug)
	const projectPath = resolvedPath ?? decodedSlug

	const files = await getProjectFiles(projectPath)
	if (!files || files.length === 0) notFound()

	const projectDisplayName = projectPath.split("/").pop() ?? projectPath
	const tags = await extractTagsFromProject(projectPath)

	const markdownFiles = files.filter(
		(file) => file.name.toLowerCase().endsWith(".md") && file.download_url
	)

	const markdownContents = await Promise.all(
		markdownFiles.map(async (file) => ({
			name: file.name,
			content: file.download_url ? await getFileContent(file.download_url) : "",
		}))
	)

	return (
		<main className="min-h-screen bg-background">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
				<Link href="/">
					<Button variant="ghost" className="mb-8 -ml-2">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Projects
					</Button>
				</Link>

				<div className="mb-12">
					<h1 className="text-4xl sm:text-5xl font-bold mb-4 text-balance">{projectDisplayName}</h1>
					{tags.length > 0 && (
						<div className="flex flex-wrap gap-2 mb-4">
							{tags.map((tag, i) => (
								<Badge key={i} variant="secondary" className={cn("text-xs", tagColorByValue[tag.toLowerCase()] ?? "")}>
									{tag}
								</Badge>
							))}
						</div>
					)}
					<p className="text-muted-foreground">
						{files.length} {files.length === 1 ? "file" : "files"} in this project
					</p>
				</div>

				{markdownContents.length > 0 && (
					<div className="space-y-8 mb-12">
						{markdownContents.map((md, i) => (
							<Card key={i}>
								<CardContent className="pt-6">
									<div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
										<FileText className="h-5 w-5 text-muted-foreground" />
										<h2 className="text-lg font-semibold">{md.name}</h2>
									</div>

									<div className="prose prose-neutral dark:prose-invert max-w-none">
										<ReactMarkdown
											remarkPlugins={[remarkGfm, remarkBreaks]}
											rehypePlugins={[rehypeRaw]}
											components={{
											img({ src, alt, ...props }) {
												const resolvedSrc = typeof src === "string" ? resolveAssetUrl(projectPath, src) : ""

												return (
													//eslint-disable-next-line @next/next/no-img-element
													<img
														src={resolvedSrc}
														alt={typeof alt === "string" ? alt : ""}
															loading="lazy"
															className="rounded-lg max-w-full h-auto"
															{...props}
														/>
													)
												},
												a({ href, children, ...props }) {
													const to = typeof href === "string" ? resolvePageUrl(projectPath, href) : "#"
													return (
														<a href={to} target="_blank" rel="noopener noreferrer" {...props}>
															{children}
														</a>
													)
												},
											}}
										>
											{md.content}
										</ReactMarkdown>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}

				{markdownContents.length === 0 && (
					<Card>
						<CardContent className="py-12 text-center">
							<p className="text-muted-foreground">No markdown files found in this project.</p>
						</CardContent>
					</Card>
				)}
			</div>
		</main>
	)
}
