"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      <header className="border-b border-neutral-300 bg-white px-4 py-3">
        <h1 className="text-xl font-semibold text-neutral-800">Tambola</h1>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/create"
            className="rounded-lg border-2 border-neutral-400 bg-white px-8 py-6 text-center font-medium text-neutral-800 shadow-sm hover:border-neutral-500 hover:bg-neutral-50 transition-colors"
          >
            Create room
          </Link>
          <Link
            href="/join"
            className="rounded-lg border-2 border-neutral-400 bg-white px-8 py-6 text-center font-medium text-neutral-800 shadow-sm hover:border-neutral-500 hover:bg-neutral-50 transition-colors"
          >
            Join room
          </Link>
        </div>
      </main>
    </div>
  );
}
