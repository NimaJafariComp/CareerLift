import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/lib/theme";
import type { InterviewEvaluation, SessionSummary } from "@/lib/types";

export function InterviewSummaryCard({
  summary,
  onNewInterview,
}: {
  summary: SessionSummary;
  onNewInterview?: () => void;
}) {
  const { theme } = useAppTheme();

  const validScores = summary.steps
    .filter((step) => step.evaluation?.score !== null && step.evaluation?.score !== undefined)
    .map((step) => step.evaluation!.score as number);

  const averageScore =
    validScores.length > 0 ? (validScores.reduce((left, right) => left + right, 0) / validScores.length).toFixed(1) : "N/A";

  return (
    <View style={styles.gap}>
      <View style={styles.metrics}>
        <Metric title="Average Score" value={averageScore} subtitle="out of 10" tone={theme.palette.accentStrong} />
        <Metric title="Questions" value={`${summary.steps.length}`} subtitle="completed" tone={theme.palette.success} />
      </View>

      {summary.overall_feedback ? (
        <View style={[styles.overallCard, { borderColor: `${theme.palette.warning}55`, backgroundColor: `${theme.palette.warning}18` }]}>
          <Text style={{ color: theme.palette.warning, fontWeight: "700" }}>Overall Feedback</Text>
          <Text style={{ color: theme.palette.foreground, lineHeight: theme.text.size(20) }}>{summary.overall_feedback}</Text>
        </View>
      ) : null}

      <View style={styles.gap}>
        {summary.steps.map((step, index) => (
          <View key={index} style={[styles.stepCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
            <Text style={{ color: theme.palette.accentStrong, fontWeight: "700", fontSize: theme.text.size(11) }}>{`Q${index + 1}`}</Text>
            <Text style={{ color: theme.palette.foreground, fontWeight: "700", lineHeight: theme.text.size(20) }}>{step.question.text}</Text>
            {step.answer ? (
              <View style={styles.answerBlock}>
                <Text style={{ color: theme.palette.success, fontWeight: "700", fontSize: theme.text.size(11) }}>YOUR ANSWER</Text>
                <Text style={{ color: theme.palette.foreground, lineHeight: theme.text.size(20) }}>{step.answer}</Text>
              </View>
            ) : null}
            {step.evaluation ? <RubricBreakdown evaluation={step.evaluation} /> : null}
          </View>
        ))}
      </View>

      {onNewInterview ? (
        <Pressable onPress={onNewInterview} style={[styles.primaryButton, { backgroundColor: theme.palette.accentStrong }]}>
          <Text style={styles.primaryText}>Start New Interview</Text>
        </Pressable>
      ) : null}
    </View>
  );

  function Metric({
    title,
    value,
    subtitle,
    tone,
  }: {
    title: string;
    value: string;
    subtitle: string;
    tone: string;
  }) {
    return (
      <View style={[styles.metricCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
        <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12), fontWeight: "700" }}>{title}</Text>
        <Text style={{ color: tone, fontSize: theme.text.size(28), fontWeight: "800" }}>{value}</Text>
        <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>{subtitle}</Text>
      </View>
    );
  }
}

function RubricBreakdown({ evaluation }: { evaluation: InterviewEvaluation }) {
  const { theme } = useAppTheme();
  const rubric = evaluation.rubric;
  const entries = [
    ["Relevance", rubric?.relevance],
    ["Clarity", rubric?.clarity],
    ["Technical", rubric?.technical_depth],
    ["Evidence", rubric?.evidence],
    ["Communication", rubric?.communication],
  ].filter(([, value]) => value !== null && value !== undefined) as Array<[string, number]>;

  return (
    <View style={styles.gap}>
      {evaluation.score !== null && evaluation.score !== undefined ? (
        <Text style={{ color: theme.palette.accentStrong, fontWeight: "700" }}>{evaluation.score.toFixed(1)}/10</Text>
      ) : null}
      {evaluation.feedback ? <Text style={{ color: theme.palette.foreground, lineHeight: theme.text.size(20) }}>{evaluation.feedback}</Text> : null}

      {entries.length > 0 ? (
        <View style={styles.rubricGrid}>
          {entries.map(([label, value]) => (
            <View key={label} style={[styles.rubricItem, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surface }]}>
              <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(11), fontWeight: "700" }}>{label}</Text>
              <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>{value.toFixed(1)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {evaluation.strengths?.length ? (
        <View style={styles.gap}>
          <Text style={{ color: theme.palette.success, fontWeight: "700" }}>Strengths</Text>
          {evaluation.strengths.map((item, index) => (
            <Text key={index} style={{ color: theme.palette.foreground }}>{`\u2022 ${item}`}</Text>
          ))}
        </View>
      ) : null}

      {evaluation.improvements?.length ? (
        <View style={styles.gap}>
          <Text style={{ color: theme.palette.warning, fontWeight: "700" }}>Improvements</Text>
          {evaluation.improvements.map((item, index) => (
            <Text key={index} style={{ color: theme.palette.foreground }}>{`\u2022 ${item}`}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: 12,
  },
  metrics: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 4,
    alignItems: "center",
  },
  overallCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  stepCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  answerBlock: {
    gap: 4,
  },
  rubricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  rubricItem: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: "30%",
    gap: 2,
    alignItems: "center",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
});
