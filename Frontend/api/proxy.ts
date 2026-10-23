// Vercel Function that forwards /api/* requests to the backend and adds the API key.
// The key lives only in Vercel's server-side environment variables, so it never reaches the browser.
// vercel.json rewrites /api/<path> to /api/proxy?path=<path>.
//
// Vercel environment variables (Settings -> Environment Variables, Production and Preview):
//   API_URL  the backend's base URL, e.g. https://bisonrides-api.onrender.com
//   API_KEY  the backend's API key (sent as the x-key header)

function errorResponse(status: number, detail: string) {
  return Response.json({ detail }, { status })
}

async function handler(request: Request): Promise<Response> {
  const { API_URL, API_KEY } = process.env
  if (!API_URL || !API_KEY) {
    return errorResponse(500, 'The server is missing its API_URL or API_KEY setting.')
  }

  const incoming = new URL(request.url)
  const path = incoming.searchParams.get('path') ?? ''
  incoming.searchParams.delete('path')
  const target = new URL(`${API_URL.replace(/\/+$/, '')}/${path}`)
  target.search = incoming.searchParams.toString()

  // Forward only what the backend needs: the body's type and the user's login token.
  const headers = new Headers({ 'x-key': API_KEY })
  for (const name of ['content-type', 'authorization']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  let response: Response
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    })
  } catch {
    return errorResponse(502, "Couldn't reach the backend.")
  }

  // Pass the backend's status and body through unchanged, so the pages can show its errors (409, 422, ...).
  const responseHeaders = new Headers()
  const responseType = response.headers.get('content-type')
  if (responseType) responseHeaders.set('content-type', responseType)
  return new Response(response.body, { status: response.status, headers: responseHeaders })
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE }
