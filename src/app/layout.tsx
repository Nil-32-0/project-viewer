import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import Footer from "@/components/footer"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
	title: "Projects Showcase",
	description: "A collection of my projects from GitHub",
	generator: "v0.app",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" className={`dark ${geist.variable} ${geistMono.variable}`}>
			<body className={`${geist.className} font-sans antialiased`}>
				<div className="flex min-h-screen flex-col bg-background">
					<div className="flex-1">{children}</div>
					<Footer />
				</div>
				<Analytics />
			</body>
		</html>
	)
}
