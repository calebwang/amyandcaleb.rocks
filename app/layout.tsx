import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: "Amy & Caleb's Van Life",
    viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale = 1.0, maximum-scale=1.0, user-scalable=no" />
            </head>
            <body className={inter.className}>{children}</body>
        </html>
    );
}
