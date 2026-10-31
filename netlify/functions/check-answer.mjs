
export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Missing server configuration");
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Please sign in." },
        { status: 401 }
      );
    }

    const { challenge_id, answer } = await request.json();

    if (
      typeof challenge_id !== "string" ||
      typeof answer !== "string" ||
      answer.length > 500
    ) {
      return Response.json(
        { error: "Invalid submission." },
        { status: 400 }
      );
    }

    const result = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/check_challenge_answer`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: authorization,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          p_challenge_id: challenge_id,
          p_answer: answer
        })
      }
    );

    const data = await result.json();

    if (!result.ok) {
      return Response.json(
        { error: "Answer checking failed." },
        { status: result.status }
      );
    }

    return Response.json(data);

  } catch {
    return Response.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
};

