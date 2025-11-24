export default function Footer() {
	return (
		<footer className="border-t border-border bg-background">
			<p className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-muted-foreground">
				<span>© 2025 Riley Barshak</span>
				{" — Original: "}
				<a
					href="https://github.com/rileybarshak/project-viewer"
					target="_blank"
					rel="noreferrer"
					className="underline-offset-4 hover:underline"
				>
					https://github.com/rileybarshak/project-viewer
				</a>
			</p>
		</footer>
	)
}
