import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageSourcePropType, ImageStyle, TextStyle, ViewStyle } from "react-native";
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
import {
  deleteLocalAiTemplate,
  getLocalAiTemplates,
  LocalAiTemplate,
  saveLocalAiTemplate,
} from "../utils/aiTemplateLibrary";
import api from "../utils/api";
import {
  getGreetingCardDraft,
  GreetingCardDraft,
} from "../utils/greetingCardDraft";

type CardTextMode = "short" | "long";
type CardSize = "portrait" | "square" | "story";
type CardTextStyleId =
  | "romantic"
  | "classic"
  | "modern"
  | "editorial"
  | "bold"
  | "minimal"
  | "playful"
  | "luxe"
  | "typewriter"
  | "poetic"
  | "poster"
  | "soft"
  | "letterpress"
  | "signature"
  | "cinematic"
  | "heritage";
type TemplateId =
  | "bloom"
  | "sunshine"
  | "serenity"
  | "paper"
  | "rose"
  | "forest"
  | "twilight"
  | "ocean"
  | "celebration"
  | "monochrome";
type TemplateCategory = "designed" | "life";
type LifeTemplateId =
  | "coffee"
  | "wildlife"
  | "garden"
  | "city"
  | "seaside"
  | "mountains";
type CardAccessPlan = "free" | "basic" | "premium";

type CardTextStyle = {
  id: CardTextStyleId;
  label: string;
  detail: string;
  headline: TextStyle;
  body: TextStyle;
  recipient: TextStyle;
  alignment: NonNullable<TextStyle["textAlign"]>;
  verticalPosition: NonNullable<ViewStyle["justifyContent"]>;
  accent: "line" | "dot" | "bar" | "none";
  panel: boolean;
};

const CARD_TEXT_STYLES: CardTextStyle[] = [
  {
    id: "romantic",
    label: "Handwritten",
    detail: "Soft and expressive",
    headline: {
      fontFamily: Platform.select({ ios: "Snell Roundhand", android: "cursive" }),
      fontSize: 42,
      lineHeight: 49,
      fontWeight: "400",
    },
    body: {
      fontFamily: Platform.select({ ios: "Baskerville", android: "serif" }),
      fontSize: 20,
      lineHeight: 29,
      fontStyle: "italic",
    },
    recipient: { fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif-light" }), letterSpacing: 2.4 },
    alignment: "center",
    verticalPosition: "center",
    accent: "dot",
    panel: false,
  },
  {
    id: "classic",
    label: "Classic",
    detail: "Elegant and timeless",
    headline: {
      fontFamily: Platform.select({ ios: "Baskerville", android: "serif" }),
      fontSize: 38,
      lineHeight: 45,
      fontWeight: "700",
    },
    body: {
      fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
      fontSize: 20,
      lineHeight: 29,
    },
    recipient: { fontFamily: Platform.select({ ios: "Georgia", android: "serif" }), letterSpacing: 1.8 },
    alignment: "center",
    verticalPosition: "center",
    accent: "line",
    panel: false,
  },
  {
    id: "modern",
    label: "Modern",
    detail: "Clean and confident",
    headline: {
      fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif-medium" }),
      fontSize: 41,
      lineHeight: 46,
      fontWeight: "800",
      letterSpacing: -1.1,
    },
    body: {
      fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif" }),
      fontSize: 18,
      lineHeight: 26,
    },
    recipient: { fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif-medium" }), letterSpacing: 2.8 },
    alignment: "left",
    verticalPosition: "center",
    accent: "bar",
    panel: true,
  },
  {
    id: "editorial",
    label: "Editorial",
    detail: "Magazine-inspired",
    headline: {
      fontFamily: Platform.select({ ios: "Didot", android: "serif" }),
      fontSize: 39,
      lineHeight: 45,
      fontWeight: "600",
      letterSpacing: 0.4,
    },
    body: {
      fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif-light" }),
      fontSize: 17,
      lineHeight: 25,
      letterSpacing: 0.3,
    },
    recipient: { fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif" }), letterSpacing: 3.2 },
    alignment: "left",
    verticalPosition: "flex-start",
    accent: "line",
    panel: false,
  },
  {
    id: "bold",
    label: "Bold",
    detail: "Big and celebratory",
    headline: {
      fontFamily: Platform.select({ ios: "Avenir Next Condensed", android: "sans-serif-condensed" }),
      fontSize: 48,
      lineHeight: 50,
      fontWeight: "900",
      letterSpacing: -1.2,
    },
    body: {
      fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif-medium" }),
      fontSize: 18,
      lineHeight: 25,
      fontWeight: "600",
    },
    recipient: { fontFamily: Platform.select({ ios: "Avenir Next Condensed", android: "sans-serif-condensed" }), letterSpacing: 1.2 },
    alignment: "center",
    verticalPosition: "flex-end",
    accent: "none",
    panel: true,
  },
  {
    id: "minimal",
    label: "Minimal",
    detail: "Airy and understated",
    headline: {
      fontFamily: Platform.select({ ios: "Helvetica Neue", android: "sans-serif-light" }),
      fontSize: 31,
      lineHeight: 39,
      fontWeight: "300",
      letterSpacing: 2.4,
    },
    body: {
      fontFamily: Platform.select({ ios: "Helvetica Neue", android: "sans-serif-light" }),
      fontSize: 17,
      lineHeight: 27,
      fontWeight: "300",
      letterSpacing: 0.8,
    },
    recipient: { fontFamily: Platform.select({ ios: "Helvetica Neue", android: "sans-serif-light" }), letterSpacing: 4 },
    alignment: "center",
    verticalPosition: "flex-start",
    accent: "none",
    panel: false,
  },
  {
    id: "playful",
    label: "Playful",
    detail: "Friendly and lively",
    headline: {
      fontFamily: Platform.select({ ios: "Chalkboard SE", android: "cursive" }),
      fontSize: 39,
      lineHeight: 46,
      fontWeight: "700",
    },
    body: {
      fontFamily: Platform.select({ ios: "Chalkboard SE", android: "cursive" }),
      fontSize: 19,
      lineHeight: 27,
    },
    recipient: { fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif-medium" }), letterSpacing: 1.5 },
    alignment: "center",
    verticalPosition: "center",
    accent: "dot",
    panel: false,
  },
  {
    id: "luxe",
    label: "Luxe",
    detail: "Refined and glamorous",
    headline: {
      fontFamily: Platform.select({ ios: "Didot", android: "serif" }),
      fontSize: 37,
      lineHeight: 45,
      fontWeight: "600",
      letterSpacing: 2.2,
      textTransform: "uppercase",
    },
    body: {
      fontFamily: Platform.select({ ios: "Baskerville", android: "serif" }),
      fontSize: 18,
      lineHeight: 28,
      fontStyle: "italic",
    },
    recipient: { fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif-light" }), letterSpacing: 4.2 },
    alignment: "center",
    verticalPosition: "center",
    accent: "line",
    panel: false,
  },
  {
    id: "typewriter",
    label: "Typewriter",
    detail: "Personal and nostalgic",
    headline: {
      fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
      fontSize: 34,
      lineHeight: 41,
      fontWeight: "700",
      letterSpacing: -0.4,
    },
    body: {
      fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
      fontSize: 17,
      lineHeight: 25,
    },
    recipient: { fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }), letterSpacing: 1.6 },
    alignment: "left",
    verticalPosition: "center",
    accent: "none",
    panel: true,
  },
  {
    id: "poetic",
    label: "Poetic",
    detail: "Quiet and reflective",
    headline: {
      fontFamily: Platform.select({ ios: "Baskerville", android: "serif" }),
      fontSize: 36,
      lineHeight: 44,
      fontWeight: "400",
      fontStyle: "italic",
    },
    body: {
      fontFamily: Platform.select({ ios: "Baskerville", android: "serif" }),
      fontSize: 19,
      lineHeight: 30,
      fontStyle: "italic",
    },
    recipient: { fontFamily: Platform.select({ ios: "Baskerville", android: "serif" }), letterSpacing: 2.1 },
    alignment: "right",
    verticalPosition: "center",
    accent: "dot",
    panel: false,
  },
  {
    id: "poster",
    label: "Poster",
    detail: "Strong and energetic",
    headline: {
      fontFamily: Platform.select({ ios: "Avenir Next Condensed", android: "sans-serif-condensed" }),
      fontSize: 51,
      lineHeight: 51,
      fontWeight: "900",
      letterSpacing: -1.6,
      textTransform: "uppercase",
    },
    body: {
      fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif-medium" }),
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    recipient: { fontFamily: Platform.select({ ios: "Avenir Next Condensed", android: "sans-serif-condensed" }), letterSpacing: 2 },
    alignment: "left",
    verticalPosition: "flex-end",
    accent: "bar",
    panel: false,
  },
  {
    id: "soft",
    label: "Soft",
    detail: "Warm and approachable",
    headline: {
      fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif" }),
      fontSize: 36,
      lineHeight: 43,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
    body: {
      fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif-light" }),
      fontSize: 19,
      lineHeight: 28,
      fontWeight: "400",
    },
    recipient: { fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif-medium" }), letterSpacing: 2.2 },
    alignment: "center",
    verticalPosition: "center",
    accent: "dot",
    panel: true,
  },
  {
    id: "letterpress",
    label: "Letterpress",
    detail: "Crafted and tactile",
    headline: {
      fontFamily: Platform.select({ ios: "American Typewriter", android: "serif-monospace" }),
      fontSize: 34,
      lineHeight: 42,
      fontWeight: "700",
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    body: {
      fontFamily: Platform.select({ ios: "American Typewriter", android: "serif-monospace" }),
      fontSize: 16,
      lineHeight: 25,
      letterSpacing: 0.4,
    },
    recipient: { fontFamily: Platform.select({ ios: "American Typewriter", android: "serif-monospace" }), letterSpacing: 2.6 },
    alignment: "center",
    verticalPosition: "flex-start",
    accent: "line",
    panel: false,
  },
  {
    id: "signature",
    label: "Signature",
    detail: "Flowing and intimate",
    headline: {
      fontFamily: Platform.select({ ios: "Snell Roundhand", android: "cursive" }),
      fontSize: 46,
      lineHeight: 52,
      fontWeight: "400",
    },
    body: {
      fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif-light" }),
      fontSize: 17,
      lineHeight: 27,
      fontWeight: "300",
    },
    recipient: { fontFamily: Platform.select({ ios: "Snell Roundhand", android: "cursive" }), letterSpacing: 0.8 },
    alignment: "right",
    verticalPosition: "flex-end",
    accent: "none",
    panel: false,
  },
  {
    id: "cinematic",
    label: "Cinematic",
    detail: "Dramatic and focused",
    headline: {
      fontFamily: Platform.select({ ios: "Helvetica Neue", android: "sans-serif-medium" }),
      fontSize: 44,
      lineHeight: 48,
      fontWeight: "900",
      letterSpacing: -1.4,
    },
    body: {
      fontFamily: Platform.select({ ios: "Helvetica Neue", android: "sans-serif-light" }),
      fontSize: 17,
      lineHeight: 25,
      letterSpacing: 0.5,
    },
    recipient: { fontFamily: Platform.select({ ios: "Helvetica Neue", android: "sans-serif" }), letterSpacing: 3.8 },
    alignment: "left",
    verticalPosition: "center",
    accent: "line",
    panel: true,
  },
  {
    id: "heritage",
    label: "Heritage",
    detail: "Formal and distinctive",
    headline: {
      fontFamily: Platform.select({ ios: "Copperplate", android: "serif" }),
      fontSize: 34,
      lineHeight: 42,
      fontWeight: "700",
      letterSpacing: 1.8,
      textTransform: "uppercase",
    },
    body: {
      fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
      fontSize: 18,
      lineHeight: 28,
    },
    recipient: { fontFamily: Platform.select({ ios: "Copperplate", android: "serif" }), letterSpacing: 3.2 },
    alignment: "center",
    verticalPosition: "flex-start",
    accent: "line",
    panel: false,
  },
];

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
  defaultTextStyle: CardTextStyleId;
}[] = [
  {
    id: "bloom",
    label: "Bloom",
    colors: ["#FFF1F7", "#F9A8D4", "#7C3AED"],
    textColor: "#32104F",
    softTextColor: "#6B2A70",
    accentColor: "#F472B6",
    defaultTextStyle: "romantic",
  },
  {
    id: "sunshine",
    label: "Sunshine",
    colors: ["#FFFBEA", "#FDE68A", "#FB923C"],
    textColor: "#4A2B05",
    softTextColor: "#7C4A0A",
    accentColor: "#FACC15",
    defaultTextStyle: "playful",
  },
  {
    id: "serenity",
    label: "Serenity",
    colors: ["#EFF6FF", "#93C5FD", "#312E81"],
    textColor: "#111B4C",
    softTextColor: "#334A78",
    accentColor: "#60A5FA",
    defaultTextStyle: "minimal",
  },
  {
    id: "paper",
    label: "Soft Paper",
    colors: ["#FFFDF8", "#F5F0E8", "#E9D5FF"],
    textColor: "#292524",
    softTextColor: "#57534E",
    accentColor: "#C4B5FD",
    defaultTextStyle: "classic",
  },
  {
    id: "rose",
    label: "Rose Glow",
    colors: ["#FFF7F5", "#FDA4AF", "#BE123C"],
    textColor: "#4C0519",
    softTextColor: "#881337",
    accentColor: "#FB7185",
    defaultTextStyle: "romantic",
  },
  {
    id: "forest",
    label: "Botanical",
    colors: ["#F0FDF4", "#86EFAC", "#166534"],
    textColor: "#052E16",
    softTextColor: "#166534",
    accentColor: "#4ADE80",
    defaultTextStyle: "editorial",
  },
  {
    id: "twilight",
    label: "Twilight",
    colors: ["#EDE9FE", "#7C3AED", "#172554"],
    textColor: "#FFFFFF",
    softTextColor: "#EDE9FE",
    accentColor: "#FDE68A",
    defaultTextStyle: "modern",
  },
  {
    id: "ocean",
    label: "Ocean",
    colors: ["#ECFEFF", "#22D3EE", "#075985"],
    textColor: "#083344",
    softTextColor: "#155E75",
    accentColor: "#67E8F9",
    defaultTextStyle: "minimal",
  },
  {
    id: "celebration",
    label: "Celebration",
    colors: ["#FFF7ED", "#FBBF24", "#DB2777"],
    textColor: "#4A1D05",
    softTextColor: "#7C2D12",
    accentColor: "#F97316",
    defaultTextStyle: "bold",
  },
  {
    id: "monochrome",
    label: "Editorial",
    colors: ["#FAFAF9", "#D6D3D1", "#292524"],
    textColor: "#1C1917",
    softTextColor: "#44403C",
    accentColor: "#78716C",
    defaultTextStyle: "editorial",
  },
];

const LIFE_TEMPLATES: {
  id: LifeTemplateId;
  label: string;
  detail: string;
  image: ImageSourcePropType;
  overlayColors: readonly [string, string, ...string[]];
  accentColor: string;
  defaultTextStyle: CardTextStyleId;
}[] = [
  {
    id: "coffee",
    label: "Coffee Moment",
    detail: "Warm everyday calm",
    image: require("../assets/card-templates/life-coffee.png"),
    overlayColors: ["rgba(48,30,14,0.08)", "rgba(30,18,10,0.62)"],
    accentColor: "#F4C98B",
    defaultTextStyle: "typewriter",
  },
  {
    id: "wildlife",
    label: "Wildlife",
    detail: "Open and uplifting",
    image: require("../assets/card-templates/life-wildlife.png"),
    overlayColors: ["rgba(58,38,11,0.04)", "rgba(30,20,8,0.58)"],
    accentColor: "#F6D58A",
    defaultTextStyle: "cinematic",
  },
  {
    id: "garden",
    label: "Beautiful Garden",
    detail: "Soft floral beauty",
    image: require("../assets/card-templates/life-garden.png"),
    overlayColors: ["rgba(35,52,24,0.04)", "rgba(35,24,44,0.58)"],
    accentColor: "#F9C5D5",
    defaultTextStyle: "poetic",
  },
  {
    id: "city",
    label: "City Life",
    detail: "Modern evening energy",
    image: require("../assets/card-templates/life-city.png"),
    overlayColors: ["rgba(4,12,38,0.08)", "rgba(2,7,24,0.68)"],
    accentColor: "#F9C66B",
    defaultTextStyle: "modern",
  },
  {
    id: "seaside",
    label: "Seaside",
    detail: "Bright and peaceful",
    image: require("../assets/card-templates/life-seaside.png"),
    overlayColors: ["rgba(11,50,72,0.04)", "rgba(7,35,53,0.54)"],
    accentColor: "#BAF3F7",
    defaultTextStyle: "soft",
  },
  {
    id: "mountains",
    label: "Mountain Escape",
    detail: "Quiet and reflective",
    image: require("../assets/card-templates/life-mountains.png"),
    overlayColors: ["rgba(13,31,47,0.04)", "rgba(7,20,33,0.62)"],
    accentColor: "#D7E9F2",
    defaultTextStyle: "heritage",
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

  if (template === "rose") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.rosePetal, styles.rosePetalOne]} />
        <View style={[styles.rosePetal, styles.rosePetalTwo]} />
        <View style={[styles.rosePetal, styles.rosePetalThree]} />
      </View>
    );
  }

  if (template === "forest") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.botanicalLeaf, styles.botanicalLeafOne]} />
        <View style={[styles.botanicalLeaf, styles.botanicalLeafTwo]} />
        <View style={[styles.botanicalLeaf, styles.botanicalLeafThree]} />
      </View>
    );
  }

  if (template === "twilight") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.moon} />
        <View style={[styles.starDot, styles.twilightStarOne]} />
        <View style={[styles.starDot, styles.twilightStarTwo]} />
        <View style={[styles.starDot, styles.twilightStarThree]} />
      </View>
    );
  }

  if (template === "ocean") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.oceanWave, styles.oceanWaveOne]} />
        <View style={[styles.oceanWave, styles.oceanWaveTwo]} />
        <View style={[styles.bubble, styles.bubbleOne]} />
        <View style={[styles.bubble, styles.bubbleTwo]} />
      </View>
    );
  }

  if (template === "celebration") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.confetti, styles.confettiOne]} />
        <View style={[styles.confetti, styles.confettiTwo]} />
        <View style={[styles.confetti, styles.confettiThree]} />
        <View style={[styles.confetti, styles.confettiFour]} />
        <View style={styles.celebrationGlow} />
      </View>
    );
  }

  if (template === "monochrome") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.editorialArch, styles.editorialArchOne]} />
        <View style={[styles.editorialArch, styles.editorialArchTwo]} />
        <View style={styles.editorialRule} />
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
  const [accessPlan, setAccessPlan] = useState<CardAccessPlan | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [textMode, setTextMode] = useState<CardTextMode>("short");
  const [cardSize, setCardSize] = useState<CardSize>("portrait");
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>("designed");
  const [templateId, setTemplateId] = useState<TemplateId>("bloom");
  const [lifeTemplateId, setLifeTemplateId] = useState<LifeTemplateId | null>(null);
  const [textStyleId, setTextStyleId] = useState<CardTextStyleId>("romantic");
  const [customPhotoUri, setCustomPhotoUri] = useState("");
  const [localAiTemplates, setLocalAiTemplates] = useState<LocalAiTemplate[]>([]);
  const [selectedAiTemplateId, setSelectedAiTemplateId] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [shortHeadline, setShortHeadline] = useState("");
  const [shortBody, setShortBody] = useState("");
  const [longHeadline, setLongHeadline] = useState("");
  const [longBody, setLongBody] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const [storedDraft, savedTemplates] = await Promise.all([
        getGreetingCardDraft(),
        getLocalAiTemplates(),
      ]);
      let latestPlan = String(plan || "free").toLowerCase();

      if (latestPlan === "free") {
        const latestUser = await refreshUser();
        latestPlan = String(latestUser?.plan || latestPlan).toLowerCase();
      }

      if (!mounted) return;

      if (!storedDraft) {
        Alert.alert(
          "No message selected",
          "Generate a message first, then choose Create Greeting Card."
        );
        router.back();
        return;
      }

      const cardAccessPlan: CardAccessPlan =
        latestPlan === "basic" || latestPlan === "premium" ? latestPlan : "free";

      setAccessPlan(cardAccessPlan);
      setLocalAiTemplates(savedTemplates);
      setDraft(storedDraft);
      setLongHeadline(getDefaultHeadline(storedDraft.category));
      setLongBody(storedDraft.message || "");
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
  const selectedTextStyle = useMemo(
    () => CARD_TEXT_STYLES.find((item) => item.id === textStyleId) || CARD_TEXT_STYLES[0],
    [textStyleId]
  );
  const selectedLifeTemplate = useMemo(
    () => LIFE_TEMPLATES.find((item) => item.id === lifeTemplateId) || null,
    [lifeTemplateId]
  );
  const selectedAiTemplate = useMemo(
    () => localAiTemplates.find((item) => item.id === selectedAiTemplateId) || null,
    [localAiTemplates, selectedAiTemplateId]
  );
  const backgroundImageSource: ImageSourcePropType | null = selectedLifeTemplate?.image
    || (selectedAiTemplate?.uri ? { uri: selectedAiTemplate.uri } : null)
    || (customPhotoUri ? { uri: customPhotoUri } : null);
  const hasImageBackground = Boolean(backgroundImageSource);
  const previewWidth = Math.min(width - 40, 390);
  const previewHeight = previewWidth / selectedSize.aspectRatio;
  const activeHeadline = textMode === "short" ? shortHeadline : longHeadline;
  const activeBody = textMode === "short" ? shortBody : longBody;
  const hasCardCopy = Boolean(activeHeadline.trim() && activeBody.trim());
  const isCorporateCard = draft?.mode === "corporate";
  const hasFreeAttribution = accessPlan === "free";
  const hasBasicWatermark = accessPlan === "basic";
  const activeTextColor = hasImageBackground ? "#FFFFFF" : selectedTemplate.textColor;
  const activeSoftTextColor = hasImageBackground
    ? "rgba(255,255,255,0.88)"
    : selectedTemplate.softTextColor;
  const activeAccentColor = selectedLifeTemplate?.accentColor || selectedTemplate.accentColor;
  const textAlignment = selectedTextStyle.alignment;
  const copyAlignment =
    textAlignment === "left"
      ? "flex-start"
      : textAlignment === "right"
        ? "flex-end"
        : "center";
  const headlineScale = textMode === "long" ? 0.8 : 1;
  const bodyScale = textMode === "long" ? 0.82 : 1;
  const headlineFontSize = Number(selectedTextStyle.headline.fontSize || 38);
  const headlineLineHeight = Number(selectedTextStyle.headline.lineHeight || 45);
  const bodyFontSize = Number(selectedTextStyle.body.fontSize || 20);
  const bodyLineHeight = Number(selectedTextStyle.body.lineHeight || 29);

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
        mode: draft.mode || "individual",
        category: draft.category,
        tone: draft.tone,
        context: draft.context || draft.message,
        recipientName,
        productName: draft.productName,
        platform: draft.platform,
        audience: draft.audience,
        callToAction: draft.callToAction,
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
      setLifeTemplateId(null);
      setSelectedAiTemplateId("");
      setCustomPhotoUri(result.assets[0].uri);
    }
  };

  const generateAiTemplate = async () => {
    if (!draft || generatingTemplate) return;

    if (credits < 5) {
      setError("You need at least 5 credits to generate an AI template.");
      return;
    }

    try {
      setGeneratingTemplate(true);
      setError("");
      const response = await api.post("/generate-card-template", {
        category: draft.category,
        tone: draft.tone,
        description: [
          aiPrompt.trim(),
          draft.mode === "corporate" &&
            `Business campaign artwork for ${draft.productName || "the featured offer"} on ${draft.platform || "a digital platform"}.`,
        ]
          .filter(Boolean)
          .join(" "),
        cardSize,
      });
      const imageBase64 = String(response.data?.imageBase64 || "");

      if (!imageBase64) {
        throw new Error("No template artwork was returned.");
      }

      const saved = await saveLocalAiTemplate({
        imageBase64,
        prompt: aiPrompt.trim() || `${draft.category} - ${draft.tone}`,
        category: draft.category,
        cardSize,
      });
      setLocalAiTemplates(saved.templates);
      setLifeTemplateId(null);
      setSelectedAiTemplateId(saved.template.id);
      setCustomPhotoUri("");

      const nextCredits = Number(response.data?.remainingCredits);
      setAvailableCredits(
        Number.isFinite(nextCredits) ? nextCredits : Math.max(0, credits - 5)
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
        setError("You need at least 5 credits to generate an AI template.");
        return;
      }

      if (requestError?.response?.status === 403) {
        router.replace("/upgrade");
        return;
      }

      setError(
        requestError?.response?.data?.error ||
          requestError?.message ||
          "Unable to generate a template right now."
      );
    } finally {
      setGeneratingTemplate(false);
    }
  };

  const removeAiTemplate = (template: LocalAiTemplate) => {
    Alert.alert(
      "Delete saved template?",
      "This removes the template from this device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const remaining = await deleteLocalAiTemplate(template.id);
            setLocalAiTemplates(remaining);
            if (selectedAiTemplateId === template.id) setSelectedAiTemplateId("");
          },
        },
      ]
    );
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
            <Text style={styles.title}>
              {isCorporateCard
                ? "Turn your campaign into a card."
                : "Turn the moment into a card."}
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
                <Text style={styles.fieldLabel}>
                  {isCorporateCard ? "Audience" : "Recipient"}
                </Text>
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
                <Text style={styles.fieldLabel}>
                  {isCorporateCard ? "Business" : "Sender"}
                </Text>
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

          <View style={[styles.previewShell, { width: previewWidth }]}> 
            <View
              ref={cardRef}
              collapsable={false}
              style={[
                styles.cardCanvas,
                { width: previewWidth, height: previewHeight },
              ]}
            >
              {!!backgroundImageSource && (
                <Image
                  source={backgroundImageSource}
                  resizeMode="cover"
                  style={StyleSheet.absoluteFill}
                />
              )}
              <LinearGradient
                colors={
                  selectedLifeTemplate?.overlayColors
                    || (hasImageBackground
                    ? ["rgba(17,24,39,0.08)", "rgba(17,24,39,0.62)"]
                    : selectedTemplate.colors
                    )
                }
                start={{ x: 0.05, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {!hasImageBackground && <CardDecorations template={templateId} />}
              <View style={styles.cardInner}>
                <View
                  style={[
                    styles.cardTopLine,
                    { alignItems: copyAlignment as ViewStyle["alignItems"] },
                  ]}
                >
                  {!!recipientName.trim() && (
                    <Text
                      style={[
                        styles.recipientText,
                        selectedTextStyle.recipient,
                        { textAlign: textAlignment },
                        { color: activeSoftTextColor },
                      ]}
                    >
                      FOR {recipientName.trim().toUpperCase()}
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.cardCopyWrap,
                    {
                      alignItems: copyAlignment as ViewStyle["alignItems"],
                      justifyContent: selectedTextStyle.verticalPosition,
                    },
                    selectedTextStyle.panel && styles.cardCopyPanel,
                    selectedTextStyle.panel && {
                      backgroundColor: hasImageBackground
                        ? "rgba(15,23,42,0.34)"
                        : "rgba(255,255,255,0.24)",
                    },
                  ]}
                >
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                    numberOfLines={3}
                    style={[
                      styles.cardHeadline,
                      selectedTextStyle.headline,
                      {
                        color: activeTextColor,
                        textAlign: textAlignment,
                        fontSize: headlineFontSize * headlineScale,
                        lineHeight: headlineLineHeight * headlineScale,
                      },
                    ]}
                  >
                    {activeHeadline.trim() || "Your card headline"}
                  </Text>
                  {selectedTextStyle.accent !== "none" && (
                    <View
                      style={[
                        styles.accentLine,
                        selectedTextStyle.accent === "dot" && styles.accentDot,
                        selectedTextStyle.accent === "bar" && styles.accentBar,
                        {
                          alignSelf: copyAlignment as ViewStyle["alignSelf"],
                          backgroundColor: activeAccentColor,
                        },
                      ]}
                    />
                  )}
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.58}
                    numberOfLines={textMode === "short" ? 6 : 14}
                    style={[
                      styles.cardBody,
                      selectedTextStyle.body,
                      {
                        color: activeTextColor,
                        textAlign: textAlignment,
                        fontSize: bodyFontSize * bodyScale,
                        lineHeight: bodyLineHeight * bodyScale,
                      },
                    ]}
                  >
                    {activeBody.trim() || "Generate short text or choose Long Text."}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text
                    style={[
                      styles.senderText,
                      selectedTextStyle.body,
                      {
                        textAlign: textAlignment,
                        fontSize: Math.min(bodyFontSize * 0.62, 13),
                        lineHeight: 17,
                      },
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
                {hasFreeAttribution && (
                  <View style={styles.freeAttribution}>
                    <Text style={styles.freeAttributionTitle}>Created with Message4u</Text>
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                      numberOfLines={1}
                      style={styles.freeAttributionLink}
                    >
                      Click to download: https://play.google.com/store/apps/details?id=com.mattonah.message4u
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.editorCard}>
            <Text style={styles.sectionTitle}>Choose a look</Text>

            <Text style={styles.orDivider}>TEMPLATE LIBRARY</Text>
            <View style={styles.templateCategoryTabs}>
              <TouchableOpacity
                style={[
                  styles.templateCategoryButton,
                  templateCategory === "designed" && styles.templateCategoryButtonActive,
                ]}
                onPress={() => setTemplateCategory("designed")}
              >
                <Ionicons
                  name="color-palette-outline"
                  size={17}
                  color={templateCategory === "designed" ? "#FFFFFF" : "#4B5563"}
                />
                <Text
                  style={[
                    styles.templateCategoryText,
                    templateCategory === "designed" && styles.templateCategoryTextActive,
                  ]}
                >
                  Designed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.templateCategoryButton,
                  templateCategory === "life" && styles.templateCategoryButtonActive,
                ]}
                onPress={() => setTemplateCategory("life")}
              >
                <Ionicons
                  name="camera-outline"
                  size={17}
                  color={templateCategory === "life" ? "#FFFFFF" : "#4B5563"}
                />
                <Text
                  style={[
                    styles.templateCategoryText,
                    templateCategory === "life" && styles.templateCategoryTextActive,
                  ]}
                >
                  Life Images
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.templateCategoryDetail}>
              {templateCategory === "life"
                ? "Scenes and Lifestyle Images"
                : "Illustrated colors and decorative layouts created in the app."}
            </Text>

            {templateCategory === "designed" ? (
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
                      !hasImageBackground &&
                        templateId === template.id &&
                        styles.choiceActive,
                    ]}
                    onPress={() => {
                      setTemplateId(template.id);
                      setTextStyleId(template.defaultTextStyle);
                      setLifeTemplateId(null);
                      setSelectedAiTemplateId("");
                      setCustomPhotoUri("");
                    }}
                  >
                    <LinearGradient
                      colors={template.colors}
                      style={styles.templateSwatch}
                    />
                    <Text style={styles.templateLabel}>{template.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.templateRow}
              >
                {LIFE_TEMPLATES.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.lifeTemplateChoice,
                      lifeTemplateId === template.id && styles.choiceActive,
                    ]}
                    onPress={() => {
                      setLifeTemplateId(template.id);
                      setTextStyleId(template.defaultTextStyle);
                      setSelectedAiTemplateId("");
                      setCustomPhotoUri("");
                    }}
                  >
                    <Image
                      source={template.image}
                      resizeMode="cover"
                      style={styles.lifeTemplateImage as ImageStyle}
                    />
                    <Text numberOfLines={1} style={styles.lifeTemplateLabel}>
                      {template.label}
                    </Text>
                    <Text numberOfLines={1} style={styles.lifeTemplateDetail}>
                      {template.detail}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.typographyHeading}>
              <Text style={styles.sectionTitle}>Text style</Text>
              <Text style={styles.typographyHint}>Tap to restyle the card</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typographyRow}
            >
              {CARD_TEXT_STYLES.map((textStyle) => (
                <TouchableOpacity
                  key={textStyle.id}
                  style={[
                    styles.typographyChoice,
                    textStyleId === textStyle.id && styles.typographyChoiceActive,
                  ]}
                  onPress={() => setTextStyleId(textStyle.id)}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      textStyle.headline,
                      styles.typographySample,
                      textStyleId === textStyle.id && styles.typographySampleActive,
                    ]}
                  >
                    Aa
                  </Text>
                  <Text
                    style={[
                      styles.typographyLabel,
                      textStyleId === textStyle.id && styles.typographyLabelActive,
                    ]}
                  >
                    {textStyle.label}
                  </Text>
                  <Text numberOfLines={1} style={styles.typographyDetail}>
                    {textStyle.detail}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.aiStudio}>
              <View style={styles.aiStudioHeading}>
                <View style={styles.aiIconWrap}>
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.aiStudioCopy}>
                  <Text style={styles.aiStudioTitle}>Generate an AI template</Text>
                </View>
              </View>
              <TextInput
                value={aiPrompt}
                onChangeText={setAiPrompt}
                placeholder="Describe the look, e.g. soft roses at sunrise"
                placeholderTextColor="#8B91A0"
                multiline
                maxLength={500}
                style={[styles.input, styles.aiPromptInput]}
              />
              <TouchableOpacity
                style={[
                  styles.generateTemplateButton,
                  generatingTemplate && styles.buttonDisabled,
                ]}
                onPress={generateAiTemplate}
                disabled={generatingTemplate}
              >
                {generatingTemplate ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Ionicons name="color-wand-outline" size={19} color="#FFFFFF" />
                )}
                <Text style={styles.generateTemplateText}>
                  {generatingTemplate ? "Creating artwork..." : "Generate Template - 5 credits"}
                </Text>
              </TouchableOpacity>
            </View>

            {!!localAiTemplates.length && (
              <View style={styles.libraryWrap}>
                <View style={styles.libraryHeading}>
                  <Text style={styles.libraryTitle}>My AI Templates</Text>
                  <Text style={styles.libraryCount}>{localAiTemplates.length} saved</Text>
                </View>
                <Text style={styles.libraryDetail}>
                  Reuse saved templates for free.
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.libraryRow}
                >
                  {localAiTemplates.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.aiTemplateChoice,
                        selectedAiTemplateId === template.id && styles.choiceActive,
                      ]}
                      onPress={() => {
                        setLifeTemplateId(null);
                        setSelectedAiTemplateId(template.id);
                        setCustomPhotoUri("");
                        if (template.cardSize !== cardSize) setCardSize(template.cardSize);
                      }}
                      onLongPress={() => removeAiTemplate(template)}
                    >
                      <Image
                        source={{ uri: template.uri }}
                        style={styles.aiTemplateImage as ImageStyle}
                      />
                      <Text numberOfLines={1} style={styles.aiTemplateLabel}>
                        {template.prompt}
                      </Text>
                      <TouchableOpacity
                        accessibilityLabel="Delete saved template"
                        style={styles.deleteTemplateButton}
                        onPress={() => removeAiTemplate(template)}
                      >
                        <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.photoRow}>
              <View style={styles.photoCopy}>
                <Text style={styles.photoTitle}>Personal photo</Text>
                <Text style={styles.photoDetail}>
                  Use a photo as a card background.
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

          {(hasFreeAttribution || hasBasicWatermark) && (
            <View style={styles.planNote}>
              <Ionicons name="information-circle-outline" size={20} color="#4338CA" />
              <Text style={styles.planNoteText}>
                {hasFreeAttribution
                  ? "Free cards include Message4u attribution and a download link."
                  : "Basic cards include a Message4U watermark. Premium cards export without it."}
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
  cardCopyWrap: { alignItems: "center", justifyContent: "center", flex: 1, paddingVertical: 14, width: "100%" },
  cardCopyPanel: { borderRadius: 20, paddingHorizontal: 20, marginVertical: 10 },
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
  accentDot: { width: 9, height: 9, borderRadius: 9, marginVertical: 15 },
  accentBar: { width: 5, height: 32, borderRadius: 6, marginVertical: 14 },
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
  freeAttribution: {
    width: "100%",
    backgroundColor: "rgba(17,24,39,0.78)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 6,
  },
  freeAttributionTitle: {
    color: "#FFFFFF",
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  freeAttributionLink: {
    width: "100%",
    color: "rgba(255,255,255,0.92)",
    fontSize: 7,
    lineHeight: 10,
    fontWeight: "600",
    textAlign: "center",
  },
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
  rosePetal: { position: "absolute", width: 145, height: 92, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.22)" },
  rosePetalOne: { top: -12, right: -45, transform: [{ rotate: "28deg" }] },
  rosePetalTwo: { bottom: 18, left: -62, transform: [{ rotate: "-24deg" }] },
  rosePetalThree: { bottom: -30, right: 18, transform: [{ rotate: "18deg" }, { scale: 0.7 }] },
  botanicalLeaf: { position: "absolute", width: 76, height: 155, borderRadius: 76, backgroundColor: "rgba(240,253,244,0.22)" },
  botanicalLeafOne: { top: -35, left: -20, transform: [{ rotate: "-36deg" }] },
  botanicalLeafTwo: { bottom: -42, right: -8, transform: [{ rotate: "30deg" }] },
  botanicalLeafThree: { bottom: 58, right: -42, transform: [{ rotate: "-18deg" }, { scale: 0.62 }] },
  moon: { position: "absolute", width: 118, height: 118, borderRadius: 60, top: -28, right: -20, borderWidth: 24, borderColor: "rgba(254,240,138,0.55)", backgroundColor: "transparent" },
  twilightStarOne: { top: 62, left: 42 },
  twilightStarTwo: { top: 112, left: 78, transform: [{ scale: 0.6 }] },
  twilightStarThree: { bottom: 72, right: 48, transform: [{ scale: 0.85 }] },
  oceanWave: { position: "absolute", borderRadius: 999, borderWidth: 25, borderColor: "rgba(255,255,255,0.22)" },
  oceanWaveOne: { width: 280, height: 170, bottom: -92, left: -65, transform: [{ rotate: "-9deg" }] },
  oceanWaveTwo: { width: 245, height: 150, bottom: -96, right: -82, transform: [{ rotate: "12deg" }] },
  bubble: { position: "absolute", borderRadius: 999, borderWidth: 2, borderColor: "rgba(255,255,255,0.48)" },
  bubbleOne: { width: 32, height: 32, top: 52, right: 38 },
  bubbleTwo: { width: 18, height: 18, top: 96, right: 76 },
  confetti: { position: "absolute", width: 10, height: 42, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.62)" },
  confettiOne: { top: 26, left: 36, transform: [{ rotate: "28deg" }] },
  confettiTwo: { top: 62, right: 42, transform: [{ rotate: "-34deg" }] },
  confettiThree: { bottom: 40, left: 58, transform: [{ rotate: "-18deg" }, { scale: 0.75 }] },
  confettiFour: { bottom: 82, right: 34, transform: [{ rotate: "42deg" }, { scale: 0.65 }] },
  celebrationGlow: { position: "absolute", width: 220, height: 220, borderRadius: 120, bottom: -115, right: -70, backgroundColor: "rgba(255,255,255,0.2)" },
  editorialArch: { position: "absolute", borderRadius: 999, borderWidth: 22, borderColor: "rgba(255,255,255,0.22)" },
  editorialArchOne: { width: 240, height: 240, top: -135, right: -70 },
  editorialArchTwo: { width: 190, height: 190, bottom: -108, left: -64 },
  editorialRule: { position: "absolute", width: 4, height: 110, right: 32, top: 42, backgroundColor: "rgba(28,25,23,0.18)" },
  editorCard: { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "900", marginBottom: 14 },
  aiStudio: { borderRadius: 18, padding: 14, backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#C7D2FE", marginBottom: 16 },
  aiStudioHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  aiIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#4F46E5", alignItems: "center", justifyContent: "center" },
  aiStudioCopy: { flex: 1 },
  aiStudioTitle: { color: "#312E81", fontSize: 15, fontWeight: "900" },
  aiStudioDetail: { color: "#626A7B", fontSize: 12, lineHeight: 17, marginTop: 2 },
  aiPromptInput: { minHeight: 76, paddingTop: 12, textAlignVertical: "top", marginBottom: 10 },
  generateTemplateButton: { minHeight: 48, borderRadius: 14, backgroundColor: "#4F46E5", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  generateTemplateText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  libraryWrap: { marginBottom: 16 },
  libraryHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  libraryTitle: { color: "#111827", fontSize: 15, fontWeight: "900" },
  libraryCount: { color: "#4F46E5", fontSize: 11, fontWeight: "800" },
  libraryDetail: { color: "#6B7280", fontSize: 11, lineHeight: 16, marginBottom: 9 },
  libraryRow: { gap: 10, paddingRight: 8 },
  aiTemplateChoice: { width: 104, padding: 5, borderRadius: 15, borderWidth: 2, borderColor: "transparent", backgroundColor: "#F9FAFB" },
  aiTemplateImage: { width: 90, height: 84, borderRadius: 10, backgroundColor: "#E5E7EB" },
  aiTemplateLabel: { color: "#374151", fontSize: 10, fontWeight: "700", marginTop: 6, marginHorizontal: 2, marginBottom: 2 },
  deleteTemplateButton: { position: "absolute", top: 9, right: 9, width: 27, height: 27, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(17,24,39,0.72)" },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 16, backgroundColor: "#F5F3FF", marginBottom: 13 },
  photoCopy: { flex: 1 },
  photoTitle: { color: "#312E81", fontSize: 14, fontWeight: "900" },
  photoDetail: { color: "#6B7280", fontSize: 12, lineHeight: 17, marginTop: 3 },
  photoButton: { minHeight: 42, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#C7D2FE" },
  photoButtonText: { color: "#4338CA", fontSize: 12, fontWeight: "900" },
  orDivider: { color: "#8B91A0", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: 10 },
  templateCategoryTabs: { flexDirection: "row", padding: 4, borderRadius: 15, backgroundColor: "#F1F3F7", marginBottom: 9 },
  templateCategoryButton: { flex: 1, minHeight: 42, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  templateCategoryButtonActive: { backgroundColor: "#4F46E5" },
  templateCategoryText: { color: "#4B5563", fontSize: 12, fontWeight: "900" },
  templateCategoryTextActive: { color: "#FFFFFF" },
  templateCategoryDetail: { color: "#6B7280", fontSize: 11, lineHeight: 16, marginBottom: 10 },
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
  lifeTemplateChoice: { width: 116, padding: 5, borderRadius: 15, borderWidth: 2, borderColor: "transparent", backgroundColor: "#F9FAFB" },
  lifeTemplateImage: { width: 102, height: 92, borderRadius: 10, backgroundColor: "#E5E7EB" },
  lifeTemplateLabel: { color: "#374151", fontSize: 11, fontWeight: "900", marginTop: 7, marginHorizontal: 2 },
  lifeTemplateDetail: { color: "#9CA3AF", fontSize: 9, marginTop: 2, marginHorizontal: 2, marginBottom: 2 },
  typographyHeading: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 22, marginBottom: 10 },
  typographyHint: { color: "#8B91A0", fontSize: 11, fontWeight: "700" },
  typographyRow: { gap: 10, paddingRight: 8 },
  typographyChoice: { width: 118, minHeight: 122, borderRadius: 16, borderWidth: 1.5, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", padding: 10, justifyContent: "center" },
  typographyChoiceActive: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
  typographySample: { color: "#374151", fontSize: 29, lineHeight: 35, textAlign: "center", marginBottom: 5 },
  typographySampleActive: { color: "#4338CA" },
  typographyLabel: { color: "#374151", textAlign: "center", fontSize: 12, fontWeight: "900" },
  typographyLabelActive: { color: "#4338CA" },
  typographyDetail: { color: "#9CA3AF", textAlign: "center", fontSize: 9, marginTop: 3 },
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
