import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { compilePdfToFile } from "@/lib/api/resumeLab";
import { useAppTheme } from "@/lib/theme";
import type { ResumeData, UploadedDocument } from "@/lib/types";

type Props = {
  previewImageUri: string | null;
  pageCount: number;
  currentPage: number;
  compiling: boolean;
  isRecompiling: boolean;
  selectedTemplate: string | null;
  resumeData: ResumeData | null;
  uploadedDocument: UploadedDocument | null;
  onPageChange: (page: number) => void;
};

export function PreviewCard({
  previewImageUri,
  pageCount,
  currentPage,
  compiling,
  isRecompiling,
  selectedTemplate,
  resumeData,
  uploadedDocument,
  onPageChange,
}: Props) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [sharingPdf, setSharingPdf] = React.useState(false);

  const canShareCompiled = !!resumeData && !!selectedTemplate && selectedTemplate !== "uploaded";

  async function shareCompiledPdf() {
    if (!resumeData || !selectedTemplate || selectedTemplate === "uploaded") return;
    setSharingPdf(true);
    try {
      const fileUri = await compilePdfToFile(selectedTemplate, resumeData);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } finally {
      setSharingPdf(false);
    }
  }

  return (
    <Card delay={90}>
      <View style={styles.headerRow}>
        <View style={styles.titleStack}>
          <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(18), fontWeight: "700" }}>PDF Preview</Text>
          <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13), lineHeight: theme.text.size(20) }}>
            Inline preview stays in sync with your editor. Open full-screen for page navigation and export actions.
          </Text>
        </View>
        <View style={styles.actionRow}>
          <ActionChip label="Full screen" onPress={() => router.push("/resume-preview")} />
          {canShareCompiled ? <ActionChip label={sharingPdf ? "Sharing…" : "Share PDF"} onPress={() => void shareCompiledPdf()} /> : null}
        </View>
      </View>

      {selectedTemplate === "uploaded" && uploadedDocument ? (
        <View style={[styles.uploadedSource, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
          <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(15) }}>Source file selected</Text>
          <Text style={{ color: theme.palette.muted, lineHeight: theme.text.size(20) }}>
            {uploadedDocument.name}
          </Text>
          <Text style={{ color: theme.palette.muted, lineHeight: theme.text.size(20) }}>
            The full-screen viewer can hand this file off to the system share sheet.
          </Text>
        </View>
      ) : null}

      {selectedTemplate && selectedTemplate !== "uploaded" && !previewImageUri && compiling ? <LoadingState label="Compiling preview…" /> : null}

      {selectedTemplate && selectedTemplate !== "uploaded" && previewImageUri ? (
        <View style={styles.previewStack}>
          <View style={styles.paginationRow}>
            <ActionChip label="Prev" onPress={() => onPageChange(currentPage - 1)} disabled={currentPage === 0 || isRecompiling} />
            <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>
              Page {currentPage + 1} of {pageCount || 1}
            </Text>
            <ActionChip label="Next" onPress={() => onPageChange(currentPage + 1)} disabled={currentPage >= Math.max(pageCount - 1, 0) || isRecompiling} />
          </View>
          <View style={[styles.imageFrame, { borderColor: theme.palette.divider, backgroundColor: "#ffffff" }]}>
            <Image source={{ uri: previewImageUri }} style={styles.previewImage} resizeMode="contain" />
            {isRecompiling ? (
              <View style={[styles.updatingChip, { backgroundColor: theme.palette.accentStrong }]}>
                <Text style={styles.updatingText}>Updating…</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {!selectedTemplate ? (
        <EmptyState
          title="Choose a template to begin"
          message="Select a LaTeX template or source PDF mode to activate the mobile preview surface."
        />
      ) : null}
    </Card>
  );

  function ActionChip({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.actionChip,
          {
            borderColor: theme.palette.divider,
            backgroundColor: disabled ? theme.palette.surfaceStrong : theme.palette.surfaceMuted,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Text style={{ color: theme.palette.foreground, fontWeight: "600", fontSize: theme.text.size(12) }}>{label}</Text>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  headerRow: {
    gap: 12,
  },
  titleStack: {
    gap: 6,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  uploadedSource: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  previewStack: {
    gap: 12,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  imageFrame: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    minHeight: 360,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: 520,
  },
  updatingChip: {
    position: "absolute",
    top: 14,
    right: 14,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  updatingText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
});
