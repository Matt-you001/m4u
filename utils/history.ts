// utils/history.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'messageHistory';
const MAX_HISTORY_ITEMS = 20; // 🔥 threshold

export type HistoryItem = {
  id: string;
  type: 'respond' | 'translate' | 'result' | 'corporate';
  inputText: string;
  outputText: string;
  tone?: string;
  language: string;
  platform?: string;
  createdAt: number;
};

// 🔹 Get all history
export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('History fetch failed', err);
    return [];
  }
}

// 🔹 Save new history item (newest first + auto-trim)
export async function saveToHistory(item: HistoryItem) {
  try {
    const history = await getHistory();

    const updated = [item, ...history].slice(
      0,
      MAX_HISTORY_ITEMS
    );

    await AsyncStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(updated)
    );
  } catch (err) {
    console.error('History save failed', err);
  }
}

// 🔹 Clear history
export async function clearHistory() {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.error('History clear failed', err);
  }
}
