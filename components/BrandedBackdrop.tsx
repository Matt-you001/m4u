import { StyleSheet, View } from "react-native";

type Props = {
  light?: boolean;
};

export default function BrandedBackdrop({ light = false }: Props) {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View
        style={[
          styles.blob,
          styles.blobTopLeft,
          light ? styles.lightViolet : styles.violet,
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobTopRight,
          light ? styles.lightBlue : styles.blue,
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobBottomLeft,
          light ? styles.lightPeach : styles.peach,
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobBottomRight,
          light ? styles.lightMint : styles.mint,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
  },
  blobTopLeft: {
    width: 260,
    height: 260,
    top: -90,
    left: -70,
  },
  blobTopRight: {
    width: 220,
    height: 220,
    top: 60,
    right: -90,
  },
  blobBottomLeft: {
    width: 240,
    height: 240,
    bottom: 100,
    left: -120,
  },
  blobBottomRight: {
    width: 280,
    height: 280,
    bottom: -120,
    right: -80,
  },
  violet: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
  },
  blue: {
    backgroundColor: "rgba(56, 189, 248, 0.10)",
  },
  peach: {
    backgroundColor: "rgba(251, 191, 36, 0.10)",
  },
  mint: {
    backgroundColor: "rgba(45, 212, 191, 0.10)",
  },
  lightViolet: {
    backgroundColor: "rgba(129, 140, 248, 0.18)",
  },
  lightBlue: {
    backgroundColor: "rgba(96, 165, 250, 0.14)",
  },
  lightPeach: {
    backgroundColor: "rgba(251, 191, 36, 0.14)",
  },
  lightMint: {
    backgroundColor: "rgba(52, 211, 153, 0.14)",
  },
});
