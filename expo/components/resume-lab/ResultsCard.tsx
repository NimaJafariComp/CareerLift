import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { useAppTheme } from "@/lib/theme";
import type { ResumeUploadResult } from "@/lib/types";
import { asString, stripHtmlToText } from "@/lib/utils";
import { formatUploadSummary } from "@/lib/resumeData";

export function ResultsCard({ result, onClear }: { result: ResumeUploadResult; onClear: () => void }) {
  const { theme } = useAppTheme();
  const summary = formatUploadSummary(result);

  return (
    <Card delay={110}>
      <View style={styles.headerRow}>
        <View style={styles.titleStack}>
          <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(18), fontWeight: "700" }}>Processing Results</Text>
          <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13), lineHeight: theme.text.size(20) }}>
            This mirrors the web Resume Lab results summary so you can validate extraction quality before or while editing.
          </Text>
        </View>
        <Pressable onPress={onClear}>
          <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12), textDecorationLine: "underline" }}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.summaryGrid}>
        {Object.entries(summary).map(([label, value]) => (
          <View key={label} style={[styles.summaryTile, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
            <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12), textTransform: "capitalize" }}>{label.replace(/([A-Z])/g, " $1")}</Text>
            <Text style={{ color: label === "status" ? theme.palette.success : theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(14) }}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionStack}>
        <DetailPanel title="Person">
          <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(17), fontWeight: "700" }}>{result.graph_data.person.name}</Text>
          {result.graph_data.person.email ? <MetaText text={`Email: ${result.graph_data.person.email}`} /> : null}
          {result.graph_data.person.phone ? <MetaText text={`Phone: ${result.graph_data.person.phone}`} /> : null}
          {result.graph_data.person.location ? <MetaText text={`Location: ${result.graph_data.person.location}`} /> : null}
          {result.graph_data.person.summary ? <MetaText text={result.graph_data.person.summary} /> : null}
        </DetailPanel>

        {result.graph_data.skills.length > 0 ? (
          <DetailPanel title={`Skills (${result.graph_data.skills.length})`}>
            <View style={styles.skillWrap}>
              {result.graph_data.skills.map((skill, index) => (
                <View key={`skill-${index}`} style={[styles.skillChip, { backgroundColor: theme.palette.accentSoft }]}>
                  <Text style={{ color: theme.palette.accent, fontSize: theme.text.size(12), fontWeight: "600" }}>{asString(skill)}</Text>
                </View>
              ))}
            </View>
          </DetailPanel>
        ) : null}

        {result.graph_data.experiences.length > 0 ? (
          <DetailPanel title={`Experience (${result.graph_data.experiences.length})`}>
            {result.graph_data.experiences.map((experience, index) => (
              <View key={`experience-${index}`} style={[styles.listCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surface }]}>
                <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>{asString(experience.title)}</Text>
                <Text style={{ color: theme.palette.accent }}>{asString(experience.company)}</Text>
                {experience.duration ? <MetaText text={experience.duration} /> : null}
                {experience.description ? <MetaText text={experience.description} /> : null}
              </View>
            ))}
          </DetailPanel>
        ) : null}

        {result.graph_data.education.length > 0 ? (
          <DetailPanel title={`Education (${result.graph_data.education.length})`}>
            {result.graph_data.education.map((education, index) => (
              <View key={`education-${index}`} style={[styles.listCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surface }]}>
                <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>{asString(education.degree)}</Text>
                <Text style={{ color: theme.palette.accent }}>{asString(education.institution)}</Text>
                {education.year ? <MetaText text={education.year} /> : null}
              </View>
            ))}
          </DetailPanel>
        ) : null}

        {result.graph_data.saved_jobs?.length ? (
          <DetailPanel title={`Saved Jobs (${result.graph_data.saved_jobs.length})`}>
            {result.graph_data.saved_jobs.map((job, index) => (
              <View key={`job-${index}`} style={[styles.listCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surface }]}>
                <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>{asString(job.title) || asString(job.company) || "Saved job"}</Text>
                {job.company ? <Text style={{ color: theme.palette.accent }}>{asString(job.company)}</Text> : null}
                {job.description ? <MetaText text={stripHtmlToText(job.description)} /> : null}
                {job.apply_url ? (
                  <Pressable onPress={() => void Linking.openURL(asString(job.apply_url))}>
                    <Text style={{ color: theme.palette.accentStrong, fontWeight: "600" }}>Open job</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </DetailPanel>
        ) : null}
      </View>
    </Card>
  );

  function DetailPanel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={styles.panelStack}>
        <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(16), fontWeight: "700" }}>{title}</Text>
        <View style={styles.panelChildren}>{children}</View>
      </View>
    );
  }

  function MetaText({ text }: { text: string }) {
    return <Text style={{ color: theme.palette.muted, lineHeight: theme.text.size(20), fontSize: theme.text.size(13) }}>{text}</Text>;
  }
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  titleStack: {
    flex: 1,
    gap: 6,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryTile: {
    minWidth: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  sectionStack: {
    gap: 18,
  },
  panelStack: {
    gap: 10,
  },
  panelChildren: {
    gap: 10,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  skillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
