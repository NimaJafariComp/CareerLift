"use client";

import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as AuthSession from "expo-auth-session";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { BrandMark } from "@/components/brand/BrandMark";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { BrandedBackground } from "@/components/ui/BrandedBackground";
import { useAuth } from "@/lib/auth/provider";
import {
  googleClientId,
  googleDiscovery,
  googleRedirectUri,
  microsoftClientId,
  microsoftDiscovery,
  microsoftRedirectUri,
} from "@/lib/auth/config";
import { useAppTheme } from "@/lib/theme";

type ProviderBusy = "credentials" | "google" | "microsoft" | null;

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error("Google sign-in completed, but profile retrieval failed.");
  }

  return (await response.json()) as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

async function fetchMicrosoftProfile(accessToken: string) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error("Microsoft sign-in completed, but profile retrieval failed.");
  }

  return (await response.json()) as {
    id: string;
    displayName?: string;
    mail?: string;
    userPrincipalName?: string;
  };
}

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const { signInWithPassword, completeOAuthSignIn } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState<ProviderBusy>(null);
  const [error, setError] = React.useState<string | null>(null);
  const googleHandledRef = React.useRef<string | null>(null);
  const microsoftHandledRef = React.useRef<string | null>(null);

  const [googleRequest, googleResponse, promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      clientId: googleClientId,
      redirectUri: googleRedirectUri,
      scopes: ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.Code,
      extraParams: {
        prompt: "select_account",
      },
    },
    googleDiscovery
  );

  const [microsoftRequest, microsoftResponse, promptMicrosoftAsync] = AuthSession.useAuthRequest(
    {
      clientId: microsoftClientId,
      redirectUri: microsoftRedirectUri,
      scopes: ["openid", "profile", "email", "offline_access", "User.Read"],
      responseType: AuthSession.ResponseType.Code,
      extraParams: {
        prompt: "select_account",
      },
    },
    microsoftDiscovery
  );

  React.useEffect(() => {
    async function handleGoogleResponse() {
      if (!googleResponse || googleResponse.type !== "success") return;

      const code = googleResponse.params.code;
      if (!code || googleHandledRef.current === code || !googleRequest?.codeVerifier) return;
      googleHandledRef.current = code;

      setBusy("google");
      setError(null);
      try {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: googleClientId,
            code,
            redirectUri: googleRedirectUri,
            extraParams: {
              code_verifier: googleRequest.codeVerifier,
            },
          },
          googleDiscovery
        );

        const accessToken = tokenResponse.accessToken;
        if (!accessToken) {
          throw new Error("Google sign-in did not return an access token.");
        }

        const profile = await fetchGoogleProfile(accessToken);
        await completeOAuthSignIn({
          provider: "google",
          subject: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
        });
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Google sign-in failed.");
      } finally {
        setBusy(null);
      }
    }

    void handleGoogleResponse();
  }, [completeOAuthSignIn, googleRequest?.codeVerifier, googleResponse]);

  React.useEffect(() => {
    async function handleMicrosoftResponse() {
      if (!microsoftResponse || microsoftResponse.type !== "success") return;

      const code = microsoftResponse.params.code;
      if (!code || microsoftHandledRef.current === code || !microsoftRequest?.codeVerifier) return;
      microsoftHandledRef.current = code;

      setBusy("microsoft");
      setError(null);
      try {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: microsoftClientId,
            code,
            redirectUri: microsoftRedirectUri,
            extraParams: {
              code_verifier: microsoftRequest.codeVerifier,
            },
          },
          microsoftDiscovery
        );

        const accessToken = tokenResponse.accessToken;
        if (!accessToken) {
          throw new Error("Microsoft sign-in did not return an access token.");
        }

        const profile = await fetchMicrosoftProfile(accessToken);
        await completeOAuthSignIn({
          provider: "microsoft-entra-id",
          subject: profile.id,
          email: profile.mail || profile.userPrincipalName || "",
          name: profile.displayName,
        });
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Microsoft sign-in failed.");
      } finally {
        setBusy(null);
      }
    }

    void handleMicrosoftResponse();
  }, [completeOAuthSignIn, microsoftRequest?.codeVerifier, microsoftResponse]);

  async function handleCredentials() {
    setBusy("credentials");
    setError(null);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Invalid email or password.");
    } finally {
      setBusy(null);
    }
  }

  async function handleProviderPress(provider: "google" | "microsoft") {
    if (provider === "google") {
      if (!googleClientId) {
        setError("Google OAuth is not configured. Set EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID.");
        return;
      }

      setError(null);
      setBusy("google");
      const result = await promptGoogleAsync();
      if (result.type !== "success") {
        setBusy(null);
      }
      return;
    }

    if (!microsoftClientId) {
      setError("Microsoft OAuth is not configured. Set EXPO_PUBLIC_MICROSOFT_OAUTH_CLIENT_ID.");
      return;
    }

    setError(null);
    setBusy("microsoft");
    const result = await promptMicrosoftAsync();
    if (result.type !== "success") {
      setBusy(null);
    }
  }

  const providerButtonBase = [
    styles.providerButton,
    {
      borderColor: theme.palette.divider,
      backgroundColor: theme.palette.surface,
    },
  ] as const;

  return (
    <View style={styles.root}>
      <BrandedBackground />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInUp.duration(450)} style={styles.hero}>
              <View style={styles.markRow}>
                <BrandMark size={72} />
                <View style={[styles.launchChip, { backgroundColor: `${theme.palette.accentWarm}22`, borderColor: `${theme.palette.accentWarm}44` }]}>
                  <Text style={{ color: theme.palette.accentWarm, fontWeight: "800", fontSize: theme.text.size(11), letterSpacing: 0.8 }}>
                    MOBILE AUTH LIVE
                  </Text>
                </View>
              </View>

              <BrandWordmark subtitle="Sign in once, then carry your resume, saved jobs, and interview prep everywhere." />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(450)}>
              <LinearGradient
                colors={[theme.palette.cardStart, theme.palette.cardEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.panel,
                  {
                    borderColor: theme.palette.divider,
                    shadowColor: theme.palette.shadow,
                  },
                ]}
              >
                <View style={styles.panelHeader}>
                  <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(28), fontWeight: "800", letterSpacing: -0.8 }}>
                    Sign in
                  </Text>
                  <Text style={{ color: theme.palette.muted, lineHeight: theme.text.size(21) }}>
                    Use the same credentials and providers as web, now with a native Expo flow and persistent session restore.
                  </Text>
                </View>

                <View style={styles.formGap}>
                  <View style={styles.inputGap}>
                    <Text style={[styles.inputLabel, { color: theme.palette.foreground }]}>Email</Text>
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@careerlift.ai"
                      placeholderTextColor={theme.palette.muted}
                      style={[
                        styles.input,
                        {
                          color: theme.palette.foreground,
                          borderColor: theme.palette.divider,
                          backgroundColor: theme.palette.surfaceMuted,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.inputGap}>
                    <Text style={[styles.inputLabel, { color: theme.palette.foreground }]}>Password</Text>
                    <TextInput
                      autoComplete="current-password"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      placeholderTextColor={theme.palette.muted}
                      style={[
                        styles.input,
                        {
                          color: theme.palette.foreground,
                          borderColor: theme.palette.divider,
                          backgroundColor: theme.palette.surfaceMuted,
                        },
                      ]}
                    />
                  </View>
                </View>

                {error ? (
                  <View style={[styles.errorBanner, { borderColor: `${theme.palette.danger}33`, backgroundColor: `${theme.palette.danger}14` }]}>
                    <Text style={{ color: theme.palette.danger, fontWeight: "700" }}>Auth error</Text>
                    <Text style={{ color: theme.palette.foreground, lineHeight: theme.text.size(20) }}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={() => void handleCredentials()}
                  disabled={busy !== null || !email.trim() || !password}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: busy === "credentials" ? `${theme.palette.accentStrong}88` : theme.palette.accentStrong,
                      opacity: busy !== null && busy !== "credentials" ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={styles.primaryButtonText}>{busy === "credentials" ? "Signing in..." : "Sign in with email"}</Text>
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={[styles.divider, { backgroundColor: theme.palette.divider }]} />
                  <Text style={{ color: theme.palette.muted, fontWeight: "700", fontSize: theme.text.size(11), letterSpacing: 1.1 }}>OR CONTINUE WITH</Text>
                  <View style={[styles.divider, { backgroundColor: theme.palette.divider }]} />
                </View>

                <View style={styles.providersRow}>
                  <Pressable
                    onPress={() => void handleProviderPress("google")}
                    disabled={busy !== null || !googleRequest}
                    style={[
                      providerButtonBase,
                      {
                        opacity: busy !== null && busy !== "google" ? 0.68 : !googleRequest ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Feather name="chrome" size={18} color={theme.palette.foreground} />
                    <Text style={[styles.providerText, { color: theme.palette.foreground }]}>
                      {busy === "google" ? "Connecting..." : "Google"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => void handleProviderPress("microsoft")}
                    disabled={busy !== null || !microsoftRequest}
                    style={[
                      providerButtonBase,
                      {
                        opacity: busy !== null && busy !== "microsoft" ? 0.68 : !microsoftRequest ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Feather name="grid" size={18} color={theme.palette.foreground} />
                    <Text style={[styles.providerText, { color: theme.palette.foreground }]}>
                      {busy === "microsoft" ? "Connecting..." : "Microsoft"}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.appleShell}>
                  <Pressable
                    disabled
                    style={[
                      styles.appleButton,
                      {
                        borderColor: theme.palette.divider,
                        backgroundColor: theme.palette.surfaceMuted,
                      },
                    ]}
                  >
                    <Feather name="smartphone" size={18} color={theme.palette.muted} />
                    <Text style={[styles.providerText, { color: theme.palette.muted }]}>Apple coming soon</Text>
                  </Pressable>
                </View>
              </LinearGradient>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 26,
    gap: 22,
  },
  hero: {
    gap: 16,
  },
  markRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  launchChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 22,
    gap: 18,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 30,
    elevation: 10,
  },
  panelHeader: {
    gap: 8,
  },
  formGap: {
    gap: 14,
  },
  inputGap: {
    gap: 8,
  },
  inputLabel: {
    fontWeight: "700",
    fontSize: 13,
  },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorBanner: {
    gap: 6,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  providersRow: {
    flexDirection: "row",
    gap: 10,
  },
  providerButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 12,
  },
  providerText: {
    fontWeight: "700",
    fontSize: 13,
  },
  appleShell: {
    marginTop: -2,
  },
  appleButton: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },
});
