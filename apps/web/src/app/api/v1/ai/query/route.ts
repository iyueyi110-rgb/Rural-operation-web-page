import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { answerOperationalQuestion } from "@web/lib/ai-query"

export async function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body) || typeof body.question !== "string") {
    return jsonResponse(request, { error: "Invalid AI query payload" }, { status: 400 })
  }

  const question = body.question.trim()
  if (question.length < 2 || question.length > 200) {
    return jsonResponse(request, { error: "Question length must be between 2 and 200 characters" }, { status: 400 })
  }

  const answer = await answerOperationalQuestion(question)
  return jsonResponse(request, { data: { question, answer } })
}
