import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import BrandedBackdrop from "../components/BrandedBackdrop";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import {
  getGreetingCardDraft,
  GreetingCardDraft,
} from "../utils/greetingCardDraft";

type CardTextMode = "short" | "long";
type CardSize = "portrait" | "square" | "story";
type TemplateId = "bloom" | "sunshine" | "serenity" | "paper";
type PaidPlan = "basic" | "premium";

const CARD_SIZES: {
  id: CardSize;
  label: string;
  detail: string;
  aspectRatio: number;
}[] = [
  { id: "portrait", label: "Portrait", detail: "4:5", aspectRatio: 4 / 5 },
  { id: "square", label: "Square", detail: "1:1", aspectRatio: 1 },
  { id: "story", label: "Story", detail: "9:16", aspectRatio: 9 / 16 },
];

const TEMPLATES: {
  id: TemplateId;
  label: string;
  colors: readonly [string, string, ...string[]];
  textColor: string;
  softTextColor: string;
  accentColor: string;
}[] = [
  {
    id: "bloom",
    label: "Bloom",
    colors: ["#FFF1F7", "#F9A8D4", "#7C3AED"],
    textColor: "#32104F",
    softTextColor: "#6B2A70",
    accentColor: "#F472B6",
  },
  {
    id: "sunshine",
    label: "Sunshine",
    colors: ["#FFFBEA", "#FDE68A", "#FB923C"],
    textColor: "#4A2B05",
    softTextColor: "#7C4A0A",
    accentColor: "#FACC15",
  },
  {
    id: "serenity",
    label: "Serenity",
    colors: ["#EFF6FF", "#93C5FD", "#312E81"],
    textColor: "#111B4C",
    softTextColor: "#334A78",
    accentColor: "#60A5FA",
  },
  {
    id: "paper",
    label: "Soft Paper",
    colors: ["#FFFDF8", "#F5F0E8", "#E9D5FF"],
    textColor: "#292524",
    softTextColor: "#57534E",
    accentColor: "#C4B5FD",
  },
];

function getDefaultHeadline(category: string) {
  const normalized = category.trim().toLowerCase();
  const headlines: Record<string, string> = {
    birthday: "Happy Birthday",
    christmas: "Merry Christmas",
    "new year": "Happy New Year",
    "new month": "A Beautiful New Month",
    anniversary: "Happy Anniversary",
    "wedding anniversary": "Happy Anniversary",
    wedding: "Congratulations",
    apology: "I Am Sorry",
    romantic: "With All My Heart",
    encouragement: "Keep Going",
    congratulations: "Congratulations",
  };

  return headlines[normalized] || category.trim() || "A Special Message";
}

function CardDecorations({ template }: { template: TemplateId }) {
  if (template === "bloom") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.glow, styles.bloomGlow]} />
        <View style={[styles.flower, styles.flowerOne]} />
        <View style={[styles.flower, styles.flowerTwo]} />
        <View style={[styles.flower, styles.flowerThree]} />
        <View style={[styles.stem, styles.stemOne]} />
        <View style={[styles.stem, styles.stemTwo]} />
      </View>
    );
  }

  if (template === "sunshine") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.sunDisc, styles.sunOne]} />
        <View style={[styles.sunDisc, styles.sunTwo]} />
        <View style={[styles.sunDisc, styles.sunThree]} />
        <View style={[styles.leaf, styles.leafOne]} />
        <View style={[styles.leaf, styles.leafTwo]} />
      </View>
    );
  }

  if (template === "serenity") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.wave, styles.waveOne]} />
        <View style={[styles.wave, styles.waveTwo]} />
        <View style={[styles.starDot, styles.starOne]} />
        <View style={[styles.starDot, styles.starTwo]} />
        <View style={[styles.starDot, styles.starThree]} />
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.paperRing, styles.paperRingOne]} />
      <View style={[styles.paperRing, styles.paperRingTwo]} />
      <View style={styles.paperLine} />
    </View>
  );
}

export default function GreetingCardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { plan, credits, refreshUser, setAvailableCredits, clearSession } = useAuth();
  const cardRef = useRef<View>(null);

  const [draft, setDraft] = useState<GreetingCardDraft | null>(null);
  const [accessPlan, setAccessPlan] = useState<PaidPlan | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [textMode, setTextMode] = useState<CardTextMode>("short");
  const [cardSize, setCardSize] = useState<CardSize>("portrait");
  const [templateId, setTemplateId] = useState<TemplateId>("bloom");
  const [customPhotoUri, setCustomPhotoUri] = useState("");
  const [shortHeadline, setShortHeadline] = useState("");
  const [shortBody, setShortBody] = useState("");
  const [longHeadline, setLongHeadline] = useState("");
  const [longBody, setLongBody] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const storedDraft = await getGreetingCardDraft();
      const latestUser = await refreshUser();
      const latestPlan = String(latestUser?.plan || plan).toLowerCase();

      if (!mounted) return;

      if (latestPlan !== "basic" && latestPlan !== "premium") {
        router.replace("/upgrade");
        return;
      }

      if (!storedDraft) {
        Alert.alert(
          "No message selected",
          "Generate a message first, then choose Create Greeting Card."
        );
        router.back();
        return;
      }

      setAccessPlan(latestPlan as PaidPlan);
      setDraft(storedDraft);
      setLongHeadline(getDefaultHeadline(storedDraft.category));
      setLongBody(storedDraft.message);
      setRecipientName(storedDraft.recipientName || "");
      setSenderName(storedDraft.senderName || "");
      setCheckingAccess(false);
    };

    void initialize();

    return () => {
      mounted = false;
    };
  }, [plan, refreshUser, router]);

  const selectedSize = useMemo(
    () => CARD_SIZES.find((item) => item.id === cardSize) || CARD_SIZES[0],
    [cardSize]
  );
  const selectedTemplate = useMemo(
    () => TEMPLATES.find((item) => item.id === templateId) || TEMPLATES[0],
    [templateId]
  );
  const previewWidth = Math.min(width - 40, 390);
  const previewHeight = previewWidth / selectedSize.aspectRatio;
  const activeHeadline = textMode === "short" ? shortHeadline : longHeadline;
  const activeBody = textMode === "short" ? shortBody : longBody;
  const hasCardCopy = Boolean(activeHeadline.trim() && activeBody.trim());
  const hasBasicWatermark = accessPlan === "basic";
  const activeTextColor = customPhotoUri ? "#FFFFFF" : selectedTemplate.textColor;
  const activeSoftTextColor = customPhotoUri
    ? "rgba(255,255,255,0.88)"
    : selectedTemplate.softTextColor;

  const setActiveHeadline = (value: string) => {
    if (textMode === "short") setShortHeadline(value);
    else setLongHeadline(value);
  };

  const setActiveBody = (value: string) => {
    if (textMode === "short") setShortBody(value);
    else setLongBody(value);
  };

  const generateShortCopy = async () => {
    if (!draft || generating) return;

    try {
      setGenerating(true);
      setError("");
      const response = await api.post("/generate-card-text", {
        category: draft.category,
        tone: draft.tone,
        context: draft.message,
        recipientName,
        language: draft.language || "English",
      });

      setShortHeadline(String(response.data?.headline || "").trim());
      setShortBody(String(response.data?.message || "").trim());
      const nextCredits = Number(response.data?.remainingCredits);
      setAvailableCredits(
        Number.isFinite(nextCredits) ? nextCredits : Math.max(0, credits - 1)
      );
      await refreshUser();
    } catch (requestError: any) {
      if (requestError?.response?.status === 401) {
        await clearSession();
        router.replace({
          pathname: "/login",
          params: { message: "Your session has expired. Please log in again." },
        });
        return;
      }

      if (requestError?.response?.status === 402) {
        setError("You need at least 1 credit to generate new short card text.");
        return;
      }

      if (requestError?.response?.status === 403) {
        router.replace("/upgrade");
        return;
      }

      setError(
        requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          "Unable to generate short card text right now."
      );
    } finally {
      setGenerating(false);
    }
  };

  const chooseBackgroundPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Photo access needed",
        "Allow photo access to choose a personal greeting card background."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setCustomPhotoUri(result.assets[0].uri);
    }
  };

  const shareCard = async () => {
    if (!hasCardCopy || !cardRef.current || exporting) {
      setError("Add a headline and message before exporting your card.");
      return;
    }

    try {
      setExporting(true);
      setError("");

      if (!(await Sharing.isAvailableAsync())) {
        setError("Sharing is not available on this device.");
        return;
      }

      const exportWidth = 1080;
      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        width: exportWidth,
        height: Math.round(exportWidth / selectedSize.aspectRatio),
      });

      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share your Message4U greeting card",
        UTI: "public.png",
      });
    } catch {
      setError("The card could not be exported. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (checkingAccess || !draft || !accessPlan) {
    return (
      <View style={styles.loadingScreen}>
        <BrandedBackdrop light />
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Preparing your card studio...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <BrandedBackdrop light />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#4338CA" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headingWrap}>
            <Text style={styles.eyebrow}>MESSAGE4U CARD STUDIO</Text>
            <Text style={styles.title}>Turn the moment into a card.</Text>
            <Text style={styles.subtitle}>
              Choose concise card copy or reuse your full message, then make the design yours.
            </Text>
          </View>

          <View style={styles.modeTabs}>
            {(["short", "long"] as CardTextMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeTab, textMode === mode && styles.modeTabActive]}
                onPress={() => {
                  setTextMode(mode);
                  setError("");
                }}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    textMode === mode && styles.modeTabTextActive,
                  ]}
                >
                  {mode === "short" ? "Short Text" : "Long Text"}
                </Text>
                <Text
                  style={[
                    styles.modeTabDetail,
                    textMode === mode && styles.modeTabDetailActive,
                  ]}
                >
                  {mode === "short" ? "Card-sized copy" : "Full message"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {textMode === "short" && (
            <TouchableOpacity
              style={styles.generateCopyButton}
              onPress={generateShortCopy}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="sparkles" size={19} color="#FFFFFF" />
              )}
              <Text style={styles.generateCopyText}>
                {shortBody ? "Regenerate Short Text - 1 credit" : "Generate Short Text - 1 credit"}
              </Text>
            </TouchableOpacity>
          )}

          <View style={[styles.previewShell, { width: previewWidth }]}> 
            <View
              ref={cardRef}
              collapsable={false}
              style={[
                styles.cardCanvas,
                { width: previewWidth, height: previewHeight },
              ]}
            >
              {!!customPhotoUri && (
                <Image
                  source={{ uri: customPhotoUri }}
                  resizeMode="cover"
                  style={StyleSheet.absoluteFill}
                />
              )}
              <LinearGradient
                colors={
                  customPhotoUri
                    ? ["rgba(17,24,39,0.08)", "rgba(17,24,39,0.62)"]
                    : selectedTemplate.colors
                }
                start={{ x: 0.05, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {!customPhotoUri && <CardDecorations template={templateId} />}
              <View style={styles.cardInner}>
                <View style={styles.cardTopLine}>
                  {!!recipientName.trim() && (
                    <Text
                      style={[
                        styles.recipientText,
                        { color: activeSoftTextColor },
                      ]}
                    >
                      FOR {recipientName.trim().toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={styles.cardCopyWrap}>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                    numberOfLines={3}
                    style={[
                      styles.cardHeadline,
                      textMode === "long" && styles.cardHeadlineLong,
                      { color: activeTextColor },
                    ]}
                  >
                    {activeHeadline.trim() || "Your card headline"}
                  </Text>
                  <View
                    style={[
                      styles.accentLine,
                      { backgroundColor: selectedTemplate.accentColor },
                    ]}
                  />
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.58}
                    numberOfLines={textMode === "short" ? 6 : 14}
                    style={[
                      styles.cardBody,
                      textMode === "long" && styles.cardBodyLong,
                      { color: activeTextColor },
                    ]}
                  >
                    {activeBody.trim() || "Generate short text or choose Long Text."}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text
                    style={[
                      styles.senderText,
                      { color: activeSoftTextColor },
                    ]}
                  >
                    {senderName.trim() ? `- ${senderName.trim()}` : ""}
                  </Text>
                  {hasBasicWatermark && (
                    <View style={styles.watermarkPill}>
                      <Text style={styles.watermarkText}>Made with Message4U</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.editorCard}>
            <Text style={styles.sectionTitle}>Card wording</Text>
            <Text style={styles.fieldLabel}>Headline</Text>
            <TextInput
              value={activeHeadline}
              onChangeText={setActiveHeadline}
              placeholder="Add a short headline"
              placeholderTextColor="#9CA3AF"
              maxLength={60}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              value={activeBody}
              onChangeText={setActiveBody}
              placeholder={
                textMode === "short"
                  ? "Generate or write compact card text"
                  : "Edit the full message for your card"
              }
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={textMode === "short" ? 180 : 520}
              style={[styles.input, styles.messageInput]}
            />

            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <Text style={styles.fieldLabel}>Recipient</Text>
                <TextInput
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="Optional"
                  placeholderTextColor="#9CA3AF"
                  maxLength={40}
                  style={styles.input}
                />
              </View>
              <View style={styles.column}>
                <Text style={styles.fieldLabel}>Sender</Text>
                <TextInput
                  value={senderName}
                  onChangeText={setSenderName}
                  placeholder="Optional"
                  placeholderTextColor="#9CA3AF"
                  maxLength={40}
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          <View style={styles.editorCard}>
            <Text style={styles.sectionTitle}>Choose a look</Text>
            <View style={styles.photoRow}>
              <View style={styles.photoCopy}>
                <Text style={styles.photoTitle}>Personal photo</Text>
                <Text style={styles.photoDetail}>
                  Use one photo as the full card background.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={customPhotoUri ? () => setCustomPhotoUri("") : chooseBackgroundPhoto}
              >
                <Ionicons
                  name={customPhotoUri ? "close-outline" : "images-outline"}
                  size={18}
                  color="#4338CA"
                />
                <Text style={styles.photoButtonText}>
                  {customPhotoUri ? "Remove" : "Choose"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.orDivider}>OR USE A TEMPLATE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templateRow}
            >
              {TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={[
                    styles.templateChoice,
                    templateId === template.id && styles.choiceActive,
                  ]}
                  onPress={() => setTemplateId(template.id)}
                >
                  <LinearGradient
                    colors={template.colors}
                    style={styles.templateSwatch}
                  />
                  <Text style={styles.templateLabel}>{template.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.sectionTitle, styles.sizeTitle]}>Card size</Text>
            <View style={styles.sizeRow}>
              {CARD_SIZES.map((size) => (
                <TouchableOpacity
                  key={size.id}
                  style={[
                    styles.sizeChoice,
                    cardSize === size.id && styles.sizeChoiceActive,
                  ]}
                  onPress={() => setCardSize(size.id)}
                >
                  <Text
                    style={[
                      styles.sizeLabel,
                      cardSize === size.id && styles.sizeLabelActive,
                    ]}
                  >
                    {size.label}
                  </Text>
                  <Text
                    style={[
                      styles.sizeDetail,
                      cardSize === size.id && styles.sizeDetailActive,
                    ]}
                  >
                    {size.detail}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {hasBasicWatermark && (
            <View style={styles.planNote}>
              <Ionicons name="information-circle-outline" size={20} color="#4338CA" />
              <Text style={styles.planNoteText}>
                Basic cards include a Message4U watermark. Premium cards export without it.
              </Text>
            </View>
          )}

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.shareButton, !hasCardCopy && styles.buttonDisabled]}
            onPress={shareCard}
            disabled={exporting || !hasCardCopy}
          >
            {exporting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="share-social-outline" size={21} color="#FFFFFF" />
            )}
            <Text style={styles.shareButtonText}>
              {exporting ? "Preparing PNG..." : "Export and Share Card"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: "#F6F7FF" },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F7FF",
    gap: 14,
  },
  loadingText: { color: "#4338CA", fontSize: 16, fontWeight: "700" },
  content: { padding: 20, paddingBottom: 52 },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 8,
    marginBottom: 10,
  },
  backText: { color: "#4338CA", fontSize: 17, fontWeight: "800" },
  headingWrap: { marginBottom: 20 },
  eyebrow: {
    color: "#4F46E5",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    color: "#111827",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: { color: "#5F6675", fontSize: 16, lineHeight: 24, marginTop: 8 },
  modeTabs: {
    flexDirection: "row",
    padding: 5,
    borderRadius: 20,
    backgroundColor: "rgba(229, 231, 235, 0.88)",
    marginBottom: 12,
  },
  modeTab: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 16 },
  modeTabActive: { backgroundColor: "#FFFFFF" },
  modeTabText: { textAlign: "center", color: "#4B5563", fontWeight: "800" },
  modeTabTextActive: { color: "#4338CA" },
  modeTabDetail: { textAlign: "center", color: "#7B8190", fontSize: 11, marginTop: 3 },
  modeTabDetailActive: { color: "#6366F1" },
  generateCopyButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#4F46E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginBottom: 16,
  },
  generateCopyText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  previewShell: {
    alignSelf: "center",
    borderRadius: 28,
    padding: 7,
    backgroundColor: "rgba(255,255,255,0.9)",
    shadowColor: "#312E81",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 8,
    marginBottom: 22,
  },
  cardCanvas: { overflow: "hidden", borderRadius: 22, backgroundColor: "#FDF2F8" },
  cardInner: { flex: 1, padding: "9%", justifyContent: "space-between" },
  cardTopLine: { minHeight: 22 },
  recipientText: { fontSize: 11, fontWeight: "900", letterSpacing: 1.8 },
  cardCopyWrap: { alignItems: "center", justifyContent: "center", flex: 1, paddingVertical: 14 },
  cardHeadline: {
    width: "100%",
    textAlign: "center",
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "700",
  },
  cardHeadlineLong: { fontSize: 29, lineHeight: 35 },
  accentLine: { width: 44, height: 4, borderRadius: 99, marginVertical: 18 },
  cardBody: {
    width: "100%",
    textAlign: "center",
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
    fontSize: 22,
    lineHeight: 31,
    fontWeight: "500",
  },
  cardBodyLong: { fontSize: 17, lineHeight: 24 },
  cardFooter: { minHeight: 30, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
  senderText: { flex: 1, fontSize: 12, fontStyle: "italic", fontWeight: "700" },
  watermarkPill: { backgroundColor: "rgba(17,24,39,0.68)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  watermarkText: { color: "#FFFFFF", fontSize: 8, fontWeight: "800", letterSpacing: 0.3 },
  glow: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.42)" },
  bloomGlow: { width: 220, height: 220, top: -90, left: -70 },
  flower: { position: "absolute", width: 74, height: 74, borderRadius: 37, backgroundColor: "rgba(255,255,255,0.28)", borderWidth: 13, borderColor: "rgba(236,72,153,0.28)" },
  flowerOne: { right: -12, bottom: 28 },
  flowerTwo: { left: 18, bottom: -22, transform: [{ scale: 0.72 }] },
  flowerThree: { right: 72, bottom: -35, transform: [{ scale: 0.52 }] },
  stem: { position: "absolute", width: 3, height: 150, bottom: -30, backgroundColor: "rgba(80,35,100,0.22)", borderRadius: 99, transform: [{ rotate: "18deg" }] },
  stemOne: { right: 52 },
  stemTwo: { left: 70, transform: [{ rotate: "-14deg" }] },
  sunDisc: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.34)" },
  sunOne: { width: 170, height: 170, top: -65, right: -45 },
  sunTwo: { width: 110, height: 110, bottom: 8, left: -38 },
  sunThree: { width: 65, height: 65, top: "42%", right: 15 },
  leaf: { position: "absolute", width: 52, height: 112, borderRadius: 52, backgroundColor: "rgba(101,83,18,0.18)", bottom: -18 },
  leafOne: { right: 34, transform: [{ rotate: "24deg" }] },
  leafTwo: { right: 84, transform: [{ rotate: "-20deg" }, { scale: 0.72 }] },
  wave: { position: "absolute", borderRadius: 999, borderWidth: 30, borderColor: "rgba(255,255,255,0.16)" },
  waveOne: { width: 270, height: 270, bottom: -145, right: -95 },
  waveTwo: { width: 190, height: 190, top: -110, left: -55 },
  starDot: { position: "absolute", width: 7, height: 7, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.72)" },
  starOne: { top: 58, right: 45 },
  starTwo: { top: 96, right: 78, transform: [{ scale: 0.6 }] },
  starThree: { bottom: 75, left: 48, transform: [{ scale: 0.8 }] },
  paperRing: { position: "absolute", borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(124,58,237,0.18)" },
  paperRingOne: { width: 210, height: 210, top: -90, right: -75 },
  paperRingTwo: { width: 160, height: 160, bottom: -70, left: -55 },
  paperLine: { position: "absolute", width: 90, height: 3, borderRadius: 4, top: 44, left: 34, backgroundColor: "rgba(124,58,237,0.24)" },
  editorCard: { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "900", marginBottom: 14 },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 16, backgroundColor: "#F5F3FF", marginBottom: 13 },
  photoCopy: { flex: 1 },
  photoTitle: { color: "#312E81", fontSize: 14, fontWeight: "900" },
  photoDetail: { color: "#6B7280", fontSize: 12, lineHeight: 17, marginTop: 3 },
  photoButton: { minHeight: 42, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#C7D2FE" },
  photoButtonText: { color: "#4338CA", fontSize: 12, fontWeight: "900" },
  orDivider: { color: "#8B91A0", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: 10 },
  fieldLabel: { color: "#4B5563", fontSize: 13, fontWeight: "800", marginBottom: 7 },
  input: { minHeight: 50, borderWidth: 1.4, borderColor: "#D1D5DB", borderRadius: 14, backgroundColor: "#FFFFFF", paddingHorizontal: 14, color: "#111827", fontSize: 15, marginBottom: 14 },
  messageInput: { minHeight: 108, paddingTop: 13, textAlignVertical: "top" },
  twoColumns: { flexDirection: "row", gap: 12 },
  column: { flex: 1 },
  templateRow: { gap: 10, paddingRight: 8 },
  templateChoice: { width: 92, padding: 5, borderRadius: 15, borderWidth: 2, borderColor: "transparent", backgroundColor: "#F9FAFB" },
  choiceActive: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
  templateSwatch: { height: 64, borderRadius: 10 },
  templateLabel: { color: "#374151", textAlign: "center", fontSize: 11, fontWeight: "800", marginTop: 7, marginBottom: 2 },
  sizeTitle: { marginTop: 22 },
  sizeRow: { flexDirection: "row", gap: 8 },
  sizeChoice: { flex: 1, minHeight: 62, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6", borderWidth: 1.5, borderColor: "transparent" },
  sizeChoiceActive: { backgroundColor: "#EEF2FF", borderColor: "#4F46E5" },
  sizeLabel: { color: "#4B5563", fontSize: 13, fontWeight: "800" },
  sizeLabelActive: { color: "#4338CA" },
  sizeDetail: { color: "#9CA3AF", fontSize: 11, marginTop: 3 },
  sizeDetailActive: { color: "#6366F1" },
  planNote: { flexDirection: "row", alignItems: "flex-start", gap: 9, borderRadius: 16, padding: 14, backgroundColor: "#EEF2FF", marginBottom: 14 },
  planNoteText: { flex: 1, color: "#3730A3", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  errorText: { color: "#DC2626", fontSize: 14, lineHeight: 20, fontWeight: "700", marginBottom: 12 },
  shareButton: { minHeight: 58, borderRadius: 18, backgroundColor: "#4F46E5", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  buttonDisabled: { opacity: 0.48 },
  shareButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
});
