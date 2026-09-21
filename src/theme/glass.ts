// AuraLenz — glass morphism style presets
// Mirrors frontend/src/index.css glass-morphism & glass-strong
import { StyleSheet } from "react-native";
import { Radius } from "../theme/spacing";

export const Glass = StyleSheet.create({
  // glass-morphism: card/0.75 bg, blur 16, border/0.5, radius, shadow 0 8px 32px fg/3%
  // Note: backdrop-filter (blur) is not supported on Android; use rgba bg only
  morphism: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  // glass-strong: card/0.92 bg, blur 20, border/0.4, radius, shadow 0 20px 60px fg/4%
  strong: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
});

export const glassMorphismLight = {
  backgroundColor: "rgba(255,255,255,0.75)",
  borderColor: "rgba(230,230,230,0.5)",
};

export const glassMorphismDark = {
  backgroundColor: "rgba(15,15,15,0.75)",
  borderColor: "rgba(38,38,38,0.5)",
};

export const glassStrongLight = {
  backgroundColor: "rgba(255,255,255,0.92)",
  borderColor: "rgba(230,230,230,0.4)",
};

export const glassStrongDark = {
  backgroundColor: "rgba(15,15,15,0.92)",
  borderColor: "rgba(38,38,38,0.4)",
};
