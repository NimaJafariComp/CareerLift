import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SelectField } from "@/components/ui/SelectField";
import { useAppTheme } from "@/lib/theme";
import type { ResumeSummary } from "@/lib/types";
import { asString } from "@/lib/utils";

export function ResumePickerCard({
  availableResumes,
  selectedResume,
  allowEmpty = false,
  label = "Resume",
  helper,
  onChange,
  onDelete,
  onDeleteAll,
}: {
  availableResumes: ResumeSummary[];
  selectedResume: ResumeSummary | null;
  allowEmpty?: boolean;
  label?: string;
  helper?: string;
  onChange: (resumeId: string) => void;
  onDelete?: (resumeId: string) => Promise<void> | void;
  onDeleteAll?: () => Promise<void> | void;
}) {
  const { theme } = useAppTheme();
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [confirmingDeleteAll, setConfirmingDeleteAll] = React.useState(false);
  const [busy, setBusy] = React.useState<"one" | "all" | null>(null);

  async function handleDeleteOne() {
    if (!selectedResume || !onDelete) return;
    setBusy("one");
    try {
      await onDelete(selectedResume.resume_id);
    } finally {
      setBusy(null);
      setConfirmingDelete(false);
    }
  }

  async function handleDeleteEvery() {
    if (!onDeleteAll) return;
    setBusy("all");
    try {
      await onDeleteAll();
    } finally {
      setBusy(null);
      setConfirmingDeleteAll(false);
    }
  }

  const items = [
    ...(allowEmpty
      ? [
          {
            label: availableResumes.length === 0 ? "No resumes uploaded yet" : "None (browse all jobs)",
            value: "",
          },
        ]
      : []),
    ...availableResumes.map((resume) => ({
      label: `${resume.resume_name} (${asString(resume.person_name)})`,
      value: resume.resume_id,
    })),
  ];

  return (
    <View style={[styles.container, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(16) }}>{label}</Text>
          {helper ? <Text style={{ color: theme.palette.muted, lineHeight: theme.text.size(18), fontSize: theme.text.size(12) }}>{helper}</Text> : null}
        </View>

        {availableResumes.length > 0 && onDeleteAll ? (
          confirmingDeleteAll ? (
            <View style={styles.inlineActions}>
              <Pressable onPress={() => void handleDeleteEvery()} style={[styles.warningButton, { backgroundColor: theme.palette.danger }]}>
                <Text style={styles.warningText}>{busy === "all" ? "Removing…" : "Yes, remove all"}</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmingDeleteAll(false)}>
                <Text style={{ color: theme.palette.muted, fontWeight: "600", fontSize: theme.text.size(12) }}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmingDeleteAll(true)}>
              <Text style={{ color: theme.palette.danger, fontWeight: "600", fontSize: theme.text.size(12) }}>Remove all</Text>
            </Pressable>
          )
        ) : null}
      </View>

      <SelectField label={label} value={selectedResume?.resume_id ?? ""} onChange={onChange} items={items} />

      {selectedResume ? (
        <View style={[styles.selectedCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surface }]}>
          <View style={styles.selectedHeader}>
            <View style={styles.copy}>
              <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(14) }}>
                {selectedResume.resume_name}
              </Text>
              <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>{asString(selectedResume.person_name)}</Text>
              {selectedResume.created_at ? (
                <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(11) }}>
                  Added {new Date(selectedResume.created_at).toLocaleDateString()}
                </Text>
              ) : null}
            </View>
            {onDelete ? (
              confirmingDelete ? (
                <View style={styles.inlineActions}>
                  <Pressable onPress={() => void handleDeleteOne()} style={[styles.warningButton, { backgroundColor: theme.palette.danger }]}>
                    <Text style={styles.warningText}>{busy === "one" ? "Removing…" : "Yes, remove"}</Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmingDelete(false)}>
                    <Text style={{ color: theme.palette.muted, fontWeight: "600", fontSize: theme.text.size(12) }}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setConfirmingDelete(true)}>
                  <Text style={{ color: theme.palette.danger, fontWeight: "600", fontSize: theme.text.size(12) }}>Remove</Text>
                </Pressable>
              )
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  selectedCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  selectedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  inlineActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  warningButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  warningText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
});
