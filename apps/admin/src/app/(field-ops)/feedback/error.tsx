"use client"

import { adminCopy } from "@admin/lib/admin-copy"

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-rice p-5 text-ink">
      <div className="rounded-lg border border-stone bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-extrabold">{adminCopy.errorTitle}</h1>
        <p className="mt-3 text-sm leading-7 text-ink/64">{adminCopy.errorBody}</p>
        <button className="mt-5 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white" onClick={reset} type="button">
          {adminCopy.retry}
        </button>
      </div>
    </main>
  )
}
