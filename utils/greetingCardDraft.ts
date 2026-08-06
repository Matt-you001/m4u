import AsyncStorage from "@react-native-async-storage/async-storage";

const GREETING_CARD_DRAFT_KEY = "m4u_greeting_card_draft";

export type GreetingCardDraft = {
  message: string;
  category: string;
  tone: string;
  context?: string;
  recipientName?: string;
  senderName?: string;
  language?: string;
};

export async function saveGreetingCardDraft(draft: GreetingCardDraft) {
  await AsyncStorage.setItem(GREETING_CARD_DRAFT_KEY, JSON.stringify(draft));
}

export async function getGreetingCardDraft(): Promise<GreetingCardDraft | null> {
  const storedDraft = await AsyncStorage.getItem(GREETING_CARD_DRAFT_KEY);

  if (!storedDraft) {
    return null;
  }

  try {
    return JSON.parse(storedDraft) as GreetingCardDraft;
  } catch {
    await AsyncStorage.removeItem(GREETING_CARD_DRAFT_KEY);
    return null;
  }
}
