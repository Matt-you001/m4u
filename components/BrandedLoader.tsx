import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import BrandedBackdrop from "./BrandedBackdrop";

type Props = {
  caption?: string;
};

export default function BrandedLoader({
  caption = "Preparing your messages...",
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    driftLoop.start();

    return () => {
      pulseLoop.stop();
      driftLoop.stop();
    };
  }, [drift, pulse]);

  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.04],
  });

  const logoOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });

  const logoTranslateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <View style={styles.screen}>
      <BrandedBackdrop light />
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.logoCard,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { translateY: logoTranslateY }],
            },
          ]}
        >
          <View style={styles.logoRow}>
            <Text style={styles.logoPrimary}>m</Text>
            <Text style={styles.logoAccent}>4</Text>
            <Text style={styles.logoPrimary}>U</Text>
          </View>
          <Text style={styles.caption}>{caption}</Text>
          <View style={styles.dotRow}>
            <Animated.View
              style={[
                styles.dot,
                {
                  transform: [
                    {
                      scale: pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.85, 1.15],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.55, 1],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  transform: [
                    {
                      scale: pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1.1, 0.9],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EEF2FF",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoCard: {
    width: "100%",
    maxWidth: 310,
    paddingHorizontal: 24,
    paddingVertical: 30,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(199, 210, 254, 0.7)",
    alignItems: "center",
    shadowColor: "#312E81",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  logoPrimary: {
    fontSize: 56,
    fontWeight: "900",
    color: "#5B4AF3",
    letterSpacing: -2,
  },
  logoAccent: {
    fontSize: 50,
    fontWeight: "900",
    color: "#1F2937",
    marginHorizontal: 2,
    letterSpacing: -2,
  },
  caption: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    color: "#4338CA",
    fontWeight: "600",
  },
  dotRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4F46E5",
  },
});
