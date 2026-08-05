import { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  NativeAd,
  NativeAdChoicesPlacement,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaAspectRatio,
  NativeMediaView,
} from "react-native-google-mobile-ads";
import { getResolvedNativeAdvancedAdUnitId } from "../utils/admob";

export default function HomeNativeAdCard() {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);

  useEffect(() => {
    const unitId = getResolvedNativeAdvancedAdUnitId();

    if (!unitId) {
      return;
    }

    let mounted = true;
    let loadedAd: NativeAd | null = null;

    NativeAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
      aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
      adChoicesPlacement: NativeAdChoicesPlacement.TOP_RIGHT,
      startVideoMuted: true,
    })
      .then((ad) => {
        if (!mounted) {
          ad.destroy();
          return;
        }

        loadedAd = ad;
        setNativeAd(ad);
      })
      .catch((error) => {
        console.log("native ad load failed", error);
      });

    return () => {
      mounted = false;

      if (loadedAd) {
        loadedAd.destroy();
      }
    };
  }, []);

  if (!nativeAd) {
    return null;
  }

  return (
    <NativeAdView nativeAd={nativeAd} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.badge}>Sponsored</Text>
        {nativeAd.advertiser ? (
          <NativeAsset assetType={NativeAssetType.ADVERTISER}>
            <Text style={styles.advertiser}>{nativeAd.advertiser}</Text>
          </NativeAsset>
        ) : null}
      </View>

      <View style={styles.topRow}>
        {nativeAd.icon ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        ) : (
          <View style={styles.iconFallback}>
            <Text style={styles.iconFallbackText}>Ad</Text>
          </View>
        )}

        <View style={styles.copyColumn}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.headline}>{nativeAd.headline}</Text>
          </NativeAsset>

          {nativeAd.body ? (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text style={styles.body}>{nativeAd.body}</Text>
            </NativeAsset>
          ) : null}
        </View>
      </View>

      {nativeAd.mediaContent ? (
        <NativeMediaView style={styles.media} />
      ) : null}

      {nativeAd.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text style={styles.cta}>{nativeAd.callToAction}</Text>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(224, 231, 255, 0.95)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#4338CA",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  advertiser: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  icon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
  },
  iconFallback: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  iconFallbackText: {
    color: "#4338CA",
    fontWeight: "800",
    fontSize: 14,
  },
  copyColumn: {
    flex: 1,
  },
  headline: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: "#111827",
  },
  body: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
  },
  media: {
    marginTop: 14,
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 170,
    backgroundColor: "#EDE9FE",
  },
  cta: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: "#4F46E5",
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
});
