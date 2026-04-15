import "react-native-reanimated";
import "react-native-gesture-handler";
import "../global.css";

import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppDrawerContent } from "@/components/shell/AppDrawerContent";
import { BrandedBackground } from "@/components/ui/BrandedBackground";
import { LoadingState } from "@/components/ui/LoadingState";
import { ThemeProvider, useAppTheme } from "@/lib/theme";

function DrawerLayout() {
  const { ready, theme } = useAppTheme();

  if (!ready) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BrandedBackground />
        <LoadingState label="Launching CareerLift…" />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <Drawer
        backBehavior="history"
        drawerContent={(props) => <AppDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          overlayColor: "rgba(0,0,0,0.45)",
          drawerType: "slide",
          sceneStyle: {
            backgroundColor: "transparent",
          },
          swipeEdgeWidth: 80,
        }}
      >
        <Drawer.Screen name="index" options={{ drawerLabel: "Dashboard", title: "Dashboard" }} />
        <Drawer.Screen name="resume-lab" options={{ drawerLabel: "Resume Lab", title: "Resume Lab" }} />
        <Drawer.Screen name="job-finder" options={{ drawerLabel: "Job Finder", title: "Job Finder" }} />
        <Drawer.Screen name="applications" options={{ drawerLabel: "Applications", title: "Applications" }} />
        <Drawer.Screen name="coach-center" options={{ drawerLabel: "Coach Center", title: "Coach Center" }} />
        <Drawer.Screen name="settings" options={{ drawerLabel: "Settings", title: "Settings" }} />
        <Drawer.Screen name="resume-preview" options={{ drawerItemStyle: { display: "none" }, title: "Resume Preview" }} />
        <Drawer.Screen name="coach-interview" options={{ drawerItemStyle: { display: "none" }, title: "Mock Interview" }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DrawerLayout />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
