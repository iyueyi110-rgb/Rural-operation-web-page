export function shouldCreateReportNotification(existingReport: { id: string } | null) {
  return existingReport === null
}

export function collectActiveAdopterPhones(
  adoptions: Array<{ adopterPhone: string | null }>,
) {
  return Array.from(
    new Set(
      adoptions
        .map((adoption) => adoption.adopterPhone)
        .filter((phone): phone is string => typeof phone === "string" && phone.length > 0),
    ),
  )
}
