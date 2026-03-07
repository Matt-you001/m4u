import api from "../utils/api";

export async function generateResponse(
  message: string,
  tone: string,
  language?: string
) {
  const res = await api.post("/respond", {
    message,
    tone,
    language,
  });

  return res.data.result;
}
