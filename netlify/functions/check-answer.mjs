
export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const {
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SECRET_KEY
    } = process.env;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SUPABASE_SECRET_KEY) {
      throw new Error("Server configuration is incomplete");
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return Response.json({ error: "Please sign in." }, { status: 401 });
    }

    const token = authorization.slice(7);
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`
      }
    });

    if (!userResponse.ok) {
      return Response.json({ error: "Invalid session." }, { status: 401 });
    }

    const user = await userResponse.json();
    const body = await request.json();
    const { challenge_id, answer } = body;

    if (
      typeof challenge_id !== "string" ||
      typeof answer !== "string" ||
      answer.length > 500
    ) {
      return Response.json({ error: "Invalid submission." }, { status: 400 });
    }

    const headers = {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json"
    };

    const answerResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/challenge_answers?challenge_id=eq.${encodeURIComponent(challenge_id)}&select=answer`,
      { headers }
    );

    if (!answerResponse.ok) {
      throw new Error("Could not check answer");
    }

    const records = await answerResponse.json();
    const correctAnswer = records[0]?.answer;

    if (typeof correctAnswer !== "string") {
      return Response.json({ error: "Challenge not found." }, { status: 404 });
    }

    const normalize = value =>
      value.trim().toLowerCase().replace(/\s+/g, " ");

    if (normalize(answer) !== normalize(correctAnswer)) {
      return Response.json({ correct: false, message: "Not quite. Try again!" });
    }

    const completionResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/completions`,
      {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          player_id: user.id,
          challenge_id
        })
      }
    );

    if (!completionResponse.ok) {
      throw new Error("Could not save completion");
    }

    return Response.json({
      correct: true,
      message: "Challenge completed!"
    });

  } catch {
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
};
