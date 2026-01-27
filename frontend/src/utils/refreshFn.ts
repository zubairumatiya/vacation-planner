export default async function refreshFn(apiURL: string, priorResult: Response) {
  console.log("refreshFn entereed");

  const priorData = await priorResult.json();
  if (priorData.error === "JwtError") {
    return { status: 500, error: "JwtError" };
  }
  const result = await fetch(`${apiURL}/auth/refresh`, {
    method: "GET",
    credentials: "include",
  });
  if (!result.ok) {
    return { status: 500, error: "could not refresh" };
  } else if (result.ok) {
    console.log("new token received on frontend");
    const data = await result.json();
    return { status: 200, token: data.token };
  }
}
