import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const LIBRARY_KEY = "m4u_ai_template_library_v1";
const MAX_LOCAL_TEMPLATES = 24;

export type LocalAiTemplate = {
  id: string;
  uri: string;
  prompt: string;
  category: string;
  cardSize: "portrait" | "square" | "story";
  createdAt: string;
};

async function readIndex(): Promise<LocalAiTemplate[]> {
  try {
    const raw = await AsyncStorage.getItem(LIBRARY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getLocalAiTemplates(): Promise<LocalAiTemplate[]> {
  const templates = await readIndex();
  const validTemplates: LocalAiTemplate[] = [];

  for (const template of templates) {
    const info = await FileSystem.getInfoAsync(template.uri);
    if (info.exists) validTemplates.push(template);
  }

  if (validTemplates.length !== templates.length) {
    await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(validTemplates));
  }

  return validTemplates;
}

export async function saveLocalAiTemplate(input: {
  imageBase64: string;
  prompt: string;
  category: string;
  cardSize: LocalAiTemplate["cardSize"];
}): Promise<{ template: LocalAiTemplate; templates: LocalAiTemplate[] }> {
  if (!FileSystem.documentDirectory) {
    throw new Error("Local template storage is unavailable on this device.");
  }

  const directory = `${FileSystem.documentDirectory}message4u-ai-templates/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const id = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const uri = `${directory}${id}.png`;
  await FileSystem.writeAsStringAsync(uri, input.imageBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const template: LocalAiTemplate = {
    id,
    uri,
    prompt: input.prompt,
    category: input.category,
    cardSize: input.cardSize,
    createdAt: new Date().toISOString(),
  };
  const existing = await getLocalAiTemplates();
  const templates = [template, ...existing];
  const kept = templates.slice(0, MAX_LOCAL_TEMPLATES);
  const pruned = templates.slice(MAX_LOCAL_TEMPLATES);

  await Promise.all(
    pruned.map((item) =>
      FileSystem.deleteAsync(item.uri, { idempotent: true }).catch(() => undefined)
    )
  );
  await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(kept));

  return { template, templates: kept };
}

export async function deleteLocalAiTemplate(id: string): Promise<LocalAiTemplate[]> {
  const templates = await readIndex();
  const removed = templates.find((template) => template.id === id);
  const remaining = templates.filter((template) => template.id !== id);

  if (removed) {
    await FileSystem.deleteAsync(removed.uri, { idempotent: true }).catch(() => undefined);
  }
  await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(remaining));

  return remaining;
}
