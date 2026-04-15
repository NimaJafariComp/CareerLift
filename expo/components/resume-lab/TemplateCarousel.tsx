import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { useAppTheme } from "@/lib/theme";
import type { ResumeData, TemplateInfo } from "@/lib/types";

type Props = {
  templates: TemplateInfo[];
  selectedTemplate: string | null;
  hasUploadedFile: boolean;
  resumeData: ResumeData | null;
  onSelectTemplate: (templateId: string) => void;
};

const engineLabel: Record<string, string> = {
  pdflatex: "pdfLaTeX",
  xelatex: "XeLaTeX",
};

export function TemplateCarousel({
  templates,
  selectedTemplate,
  hasUploadedFile,
  onSelectTemplate,
}: Props) {
  const { theme } = useAppTheme();

  return (
    <Card delay={50}>
      <View style={styles.titleStack}>
        <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(18), fontWeight: "700" }}>Select Template</Text>
        <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13), lineHeight: theme.text.size(20) }}>
          Pick a LaTeX layout for live preview and PDF export. Source PDF mode stays available when you upload a PDF.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {hasUploadedFile ? (
          <TemplateCard
            active={selectedTemplate === "uploaded"}
            title="Uploaded Source"
            subtitle="Preview the source PDF"
            meta="Original file"
            onPress={() => onSelectTemplate("uploaded")}
          />
        ) : null}
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            active={selectedTemplate === template.id}
            title={template.name}
            subtitle={template.description}
            meta={`${engineLabel[template.engine] || template.engine} · ${template.supported_sections.length} sections`}
            onPress={() => onSelectTemplate(template.id)}
          />
        ))}
      </ScrollView>
    </Card>
  );

  function TemplateCard({
    active,
    title,
    subtitle,
    meta,
    onPress,
  }: {
    active: boolean;
    title: string;
    subtitle: string;
    meta: string;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.templateCard,
          {
            borderColor: active ? theme.palette.accentStrong : theme.palette.divider,
            backgroundColor: active ? theme.palette.accentSoft : theme.palette.surfaceMuted,
          },
        ]}
      >
        <View
          style={[
            styles.previewStub,
            {
              backgroundColor: active ? theme.palette.surface : theme.palette.surfaceStrong,
              borderColor: theme.palette.divider,
            },
          ]}
        >
          <View style={[styles.previewBar, { backgroundColor: theme.palette.accentSoft }]} />
          <View style={[styles.previewLine, { backgroundColor: theme.palette.divider }]} />
          <View style={[styles.previewLineShort, { backgroundColor: theme.palette.divider }]} />
          <View style={[styles.previewLine, { backgroundColor: theme.palette.divider }]} />
        </View>
        <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(14) }} numberOfLines={2}>
          {title}
        </Text>
        <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12), lineHeight: theme.text.size(18) }} numberOfLines={3}>
          {subtitle}
        </Text>
        <Text style={{ color: active ? theme.palette.accent : theme.palette.muted, fontSize: theme.text.size(11), fontWeight: "600" }} numberOfLines={1}>
          {meta}
        </Text>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  titleStack: {
    gap: 6,
  },
  scrollContent: {
    gap: 12,
    paddingRight: 4,
  },
  templateCard: {
    width: 176,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  previewStub: {
    height: 140,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  previewBar: {
    width: "55%",
    height: 14,
    borderRadius: 999,
  },
  previewLine: {
    width: "100%",
    height: 10,
    borderRadius: 999,
  },
  previewLineShort: {
    width: "68%",
    height: 10,
    borderRadius: 999,
  },
});
