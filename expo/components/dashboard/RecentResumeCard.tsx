import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatPill } from "@/components/ui/StatPill";
import { fetchResumeGraph, listResumes } from "@/lib/api/dashboard";
import { useAppTheme } from "@/lib/theme";
import type { RecentResumeSnapshot } from "@/lib/types";
import { clearRecentResume, getRecentResume, makeRecentResumeFallback, setRecentResume } from "@/lib/storage/recentResume";
import { timeAgo } from "@/lib/utils";

export function RecentResumeCard() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [resume, setResume] = React.useState<RecentResumeSnapshot | null | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);

  const loadResume = React.useCallback(async () => {
    setError(null);
    try {
      const cached = await getRecentResume();
      const resumes = await listResumes();

      if (cached) {
        const exists = resumes.some((item) => item.resume_id === cached.resume_id || item.resume_name === cached.resume_name);
        if (exists) {
          const personName = cached.person_name;
          if (personName) {
            try {
              const graph = await fetchResumeGraph(personName);
              const enriched = {
                ...cached,
                person_name: graph.person?.name || cached.person_name,
                email: graph.person?.email || cached.email,
                summary: graph.person?.summary || cached.summary,
                counts: {
                  skills: graph.skills.length,
                  experiences: graph.experiences.length,
                  education: graph.education.length,
                },
                filename: String(graph.resumes?.[0]?.filename ?? cached.filename ?? cached.resume_name),
              };
              await setRecentResume(enriched);
              setResume(enriched);
            } catch {
              setResume(cached);
            }
          } else {
            setResume(cached);
          }
          return;
        }

        await clearRecentResume();
      }

      if (resumes[0]) {
        const fallback = makeRecentResumeFallback(resumes[0]);
        try {
          const graph = await fetchResumeGraph(fallback.person_name);
          const enriched = {
            ...fallback,
            person_name: graph.person?.name || fallback.person_name,
            email: graph.person?.email,
            summary: graph.person?.summary,
            counts: {
              skills: graph.skills.length,
              experiences: graph.experiences.length,
              education: graph.education.length,
            },
            filename: String(graph.resumes?.[0]?.filename ?? fallback.resume_name),
          };
          await setRecentResume(enriched);
          setResume(enriched);
        } catch {
          await setRecentResume(fallback);
          setResume(fallback);
        }
        return;
      }

      setResume(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load your recent resume.");
      setResume(null);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadResume();
    }, [loadResume])
  );

  return (
    <Card delay={30}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(18), fontWeight: "700" }}>Resume</Text>
          <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>Your latest resume context</Text>
        </View>
        <Pressable onPress={() => router.push("/resume-lab")}>
          <Text style={{ color: theme.palette.accent, fontSize: theme.text.size(13), fontWeight: "600" }}>Open →</Text>
        </Pressable>
      </View>

      {resume === undefined ? <LoadingState label="Loading recent resume…" /> : null}
      {error ? <ErrorState title="Resume unavailable" message={error} onRetry={() => void loadResume()} /> : null}
      {resume === null && !error ? (
        <EmptyState
          title="No resume selected yet"
          message="Upload or reopen a resume in Resume Lab and we’ll pin its latest details, stats, and graph-backed context here."
          actionLabel="Go to Resume Lab"
          onAction={() => router.push("/resume-lab")}
        />
      ) : null}

      {resume ? (
        <View style={styles.sectionGap}>
          <View style={styles.textStack}>
            <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(17), fontWeight: "600" }}>{resume.person_name || resume.resume_name}</Text>
            <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13) }}>{resume.email || resume.resume_name}</Text>
            <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>
              Updated {timeAgo(resume.storedAt)}
            </Text>
          </View>

          {resume.summary ? (
            <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13), lineHeight: theme.text.size(19) }}>{resume.summary}</Text>
          ) : null}

          {resume.counts ? (
            <View style={styles.metricRow}>
              <StatPill label="Skills" value={resume.counts.skills} />
              <StatPill label="Experience" value={resume.counts.experiences} />
              <StatPill label="Education" value={resume.counts.education} />
            </View>
          ) : (
            <View
              className="rounded-2xl px-4 py-3"
              style={{ backgroundColor: theme.palette.surfaceMuted, borderWidth: 1, borderColor: theme.palette.divider }}
            >
              <Text style={{ color: theme.palette.muted, lineHeight: theme.text.size(19), fontSize: theme.text.size(13) }}>
                Detailed parsing stats are not available for this resume snapshot yet, but your current resume context is already pinned.
              </Text>
            </View>
          )}

          <View style={styles.footerRow}>
            <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>{resume.filename || resume.resume_name}</Text>
            <Pressable
              onPress={async () => {
                await clearRecentResume();
                setResume(null);
              }}
            >
              <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12), textDecorationLine: "underline" }}>Clear</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  sectionGap: {
    gap: 16,
  },
  textStack: {
    gap: 4,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
