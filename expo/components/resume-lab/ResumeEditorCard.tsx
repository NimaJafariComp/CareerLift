import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { useAppTheme } from "@/lib/theme";
import type { ResumeData, TemplateInfo } from "@/lib/types";
import {
  RESUME_SECTIONS,
  addItem,
  createEmptyEducation,
  createEmptyExperience,
  ensureArrayText,
  isSectionSupported,
  removeItem,
  serializeArrayText,
  updateItem,
} from "@/lib/resumeData";

type Props = {
  data: ResumeData;
  selectedTemplate: TemplateInfo | null;
  compiling: boolean;
  compileError: string | null;
  lastCompileTime: number | null;
  onCompile: () => void;
  onChange: (nextData: ResumeData) => void;
};

export function ResumeEditorCard({
  data,
  selectedTemplate,
  compiling,
  compileError,
  lastCompileTime,
  onCompile,
  onChange,
}: Props) {
  const { theme } = useAppTheme();
  const [openSections, setOpenSections] = React.useState<Set<string>>(new Set(["person", "education", "experiences", "skills"]));

  const toggleSection = React.useCallback((sectionKey: string) => {
    setOpenSections((previous) => {
      const next = new Set(previous);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  }, []);

  return (
    <Card delay={70}>
      <View style={styles.headerRow}>
        <View style={styles.titleStack}>
          <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(18), fontWeight: "700" }}>Resume Editor</Text>
          <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13), lineHeight: theme.text.size(20) }}>
            All web Resume Lab sections are available here in mobile-friendly accordions with template awareness and multiline bullet editing.
          </Text>
        </View>
        <Pressable
          onPress={onCompile}
          style={[styles.compileButton, { backgroundColor: theme.palette.accentStrong }]}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: theme.text.size(13) }}>{compiling ? "Compiling…" : "Recompile"}</Text>
        </Pressable>
      </View>

      {compileError ? (
        <View
          style={[
            styles.statusPanel,
            {
              borderColor: theme.palette.danger,
              backgroundColor: theme.isDark ? "rgba(248,113,113,0.12)" : "rgba(220,38,38,0.08)",
            },
          ]}
        >
          <Text style={{ color: theme.palette.danger, lineHeight: theme.text.size(20) }}>{compileError}</Text>
        </View>
      ) : lastCompileTime ? (
        <View style={[styles.statusPanel, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
          <Text style={{ color: theme.palette.muted }}>
            Last compile {new Date(lastCompileTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </Text>
        </View>
      ) : null}

      <View style={styles.sectionStack}>
        {RESUME_SECTIONS.map((section) => {
          const active = isSectionSupported(selectedTemplate, section.key);
          const open = openSections.has(section.key);

          return (
            <View
              key={section.key}
              style={[
                styles.sectionCard,
                {
                  borderColor: active ? theme.palette.divider : theme.palette.borderStrong,
                  backgroundColor: theme.palette.surfaceMuted,
                  opacity: active ? 1 : 0.72,
                },
              ]}
            >
              <Pressable onPress={() => toggleSection(section.key)} style={styles.sectionHeader}>
                <View style={styles.sectionHeaderTitle}>
                  <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(15), fontWeight: "700" }}>{section.label}</Text>
                  {!active ? (
                    <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(11) }}>Not used by this template</Text>
                  ) : null}
                </View>
                <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(18) }}>{open ? "−" : "+"}</Text>
              </Pressable>

              {open ? <SectionContent sectionKey={section.key} /> : null}
            </View>
          );
        })}
      </View>
    </Card>
  );

  function SectionContent({ sectionKey }: { sectionKey: string }) {
    switch (sectionKey) {
      case "person":
        return (
          <View style={styles.fieldStack}>
            <DualInput
              leftLabel="First name"
              rightLabel="Last name"
              leftValue={data.person.first_name}
              rightValue={data.person.last_name}
              onLeftChange={(value) => onChange({ ...data, person: { ...data.person, first_name: value } })}
              onRightChange={(value) => onChange({ ...data, person: { ...data.person, last_name: value } })}
            />
            <DualInput
              leftLabel="Email"
              rightLabel="Phone"
              leftValue={data.person.email}
              rightValue={data.person.phone}
              onLeftChange={(value) => onChange({ ...data, person: { ...data.person, email: value } })}
              onRightChange={(value) => onChange({ ...data, person: { ...data.person, phone: value } })}
            />
            <Field
              label="Location"
              value={data.person.location}
              onChangeText={(value) => onChange({ ...data, person: { ...data.person, location: value } })}
            />
            <DualInput
              leftLabel="Website"
              rightLabel="Website display"
              leftValue={data.person.website}
              rightValue={data.person.website_display}
              onLeftChange={(value) => onChange({ ...data, person: { ...data.person, website: value } })}
              onRightChange={(value) => onChange({ ...data, person: { ...data.person, website_display: value } })}
            />
            <DualInput
              leftLabel="LinkedIn"
              rightLabel="GitHub"
              leftValue={data.person.linkedin}
              rightValue={data.person.github}
              onLeftChange={(value) => onChange({ ...data, person: { ...data.person, linkedin: value } })}
              onRightChange={(value) => onChange({ ...data, person: { ...data.person, github: value } })}
            />
            <DualInput
              leftLabel="Tagline"
              rightLabel="Nationality"
              leftValue={data.person.tagline}
              rightValue={data.person.nationality}
              onLeftChange={(value) => onChange({ ...data, person: { ...data.person, tagline: value } })}
              onRightChange={(value) => onChange({ ...data, person: { ...data.person, nationality: value } })}
            />
            <Field
              label="Profile"
              value={data.person.profile}
              multiline
              onChangeText={(value) => onChange({ ...data, person: { ...data.person, profile: value } })}
            />
          </View>
        );
      case "education":
        return (
          <EntryList
            entries={data.education}
            onAdd={() => onChange({ ...data, education: addItem(data.education, createEmptyEducation()) })}
            renderItem={(entry, index) => (
              <EntryCard key={`education-${index}`} title={entry.degree || `Education ${index + 1}`}>
                <Field label="Degree" value={entry.degree} onChangeText={(value) => updateEducation(index, { ...entry, degree: value })} />
                <Field label="Institution" value={entry.institution} onChangeText={(value) => updateEducation(index, { ...entry, institution: value })} />
                <DualInput
                  leftLabel="Dates"
                  rightLabel="Location"
                  leftValue={entry.dates}
                  rightValue={entry.location}
                  onLeftChange={(value) => updateEducation(index, { ...entry, dates: value })}
                  onRightChange={(value) => updateEducation(index, { ...entry, location: value })}
                />
                <Field label="GPA" value={entry.gpa} onChangeText={(value) => updateEducation(index, { ...entry, gpa: value })} />
                <Field
                  label="Details (one per line)"
                  value={serializeArrayText(entry.details)}
                  multiline
                  onChangeText={(value) => updateEducation(index, { ...entry, details: ensureArrayText(value) })}
                />
                <RemoveEntryButton onPress={() => onChange({ ...data, education: removeItem(data.education, index) })} />
              </EntryCard>
            )}
          />
        );
      case "experiences":
        return (
          <EntryList
            entries={data.experiences}
            onAdd={() => onChange({ ...data, experiences: addItem(data.experiences, createEmptyExperience()) })}
            renderItem={(entry, index) => (
              <EntryCard key={`experience-${index}`} title={entry.title || `Experience ${index + 1}`}>
                <DualInput
                  leftLabel="Title"
                  rightLabel="Company"
                  leftValue={entry.title}
                  rightValue={entry.company}
                  onLeftChange={(value) => updateExperience(index, { ...entry, title: value })}
                  onRightChange={(value) => updateExperience(index, { ...entry, company: value })}
                />
                <DualInput
                  leftLabel="Dates"
                  rightLabel="Location"
                  leftValue={entry.dates}
                  rightValue={entry.location}
                  onLeftChange={(value) => updateExperience(index, { ...entry, dates: value })}
                  onRightChange={(value) => updateExperience(index, { ...entry, location: value })}
                />
                <Field label="Keywords" value={entry.keywords} onChangeText={(value) => updateExperience(index, { ...entry, keywords: value })} />
                <Field
                  label="Bullets (one per line)"
                  value={serializeArrayText(entry.bullets)}
                  multiline
                  onChangeText={(value) => updateExperience(index, { ...entry, bullets: ensureArrayText(value) })}
                />
                <RemoveEntryButton onPress={() => onChange({ ...data, experiences: removeItem(data.experiences, index) })} />
              </EntryCard>
            )}
          />
        );
      case "skills":
        return (
          <View style={styles.fieldStack}>
            <Field
              label="Flat skills (one per line)"
              value={serializeArrayText(data.skills.flat)}
              multiline
              onChangeText={(value) => onChange({ ...data, skills: { ...data.skills, flat: ensureArrayText(value) } })}
            />
            <EntryList
              entries={data.skills.categories}
              onAdd={() => onChange({ ...data, skills: { ...data.skills, categories: addItem(data.skills.categories, { name: "", items: "" }) } })}
              renderItem={(entry, index) => (
                <EntryCard key={`skill-category-${index}`} title={entry.name || `Category ${index + 1}`}>
                  <Field
                    label="Category name"
                    value={entry.name}
                    onChangeText={(value) =>
                      onChange({
                        ...data,
                        skills: {
                          ...data.skills,
                          categories: updateItem(data.skills.categories, index, { ...entry, name: value }),
                        },
                      })
                    }
                  />
                  <Field
                    label="Items"
                    value={entry.items}
                    multiline
                    onChangeText={(value) =>
                      onChange({
                        ...data,
                        skills: {
                          ...data.skills,
                          categories: updateItem(data.skills.categories, index, { ...entry, items: value }),
                        },
                      })
                    }
                  />
                  <RemoveEntryButton
                    onPress={() =>
                      onChange({
                        ...data,
                        skills: { ...data.skills, categories: removeItem(data.skills.categories, index) },
                      })
                    }
                  />
                </EntryCard>
              )}
            />
          </View>
        );
      case "projects":
        return (
          <SimpleBulletSection
            entries={data.projects}
            emptyEntry={{ title: "", context: "", dates: "", url: "", bullets: [] }}
            titleForEntry={(entry, index) => entry.title || `Project ${index + 1}`}
            fields={(entry, index) => (
              <>
                <DualInput
                  leftLabel="Title"
                  rightLabel="Context"
                  leftValue={entry.title}
                  rightValue={entry.context}
                  onLeftChange={(value) => updateProject(index, { ...entry, title: value })}
                  onRightChange={(value) => updateProject(index, { ...entry, context: value })}
                />
                <DualInput
                  leftLabel="Dates"
                  rightLabel="URL"
                  leftValue={entry.dates}
                  rightValue={entry.url}
                  onLeftChange={(value) => updateProject(index, { ...entry, dates: value })}
                  onRightChange={(value) => updateProject(index, { ...entry, url: value })}
                />
                <Field
                  label="Bullets (one per line)"
                  value={serializeArrayText(entry.bullets)}
                  multiline
                  onChangeText={(value) => updateProject(index, { ...entry, bullets: ensureArrayText(value) })}
                />
              </>
            )}
            onAdd={() => onChange({ ...data, projects: addItem(data.projects, { title: "", context: "", dates: "", url: "", bullets: [] }) })}
            onRemove={(index) => onChange({ ...data, projects: removeItem(data.projects, index) })}
          />
        );
      case "awards":
        return (
          <SimpleEntrySection
            entries={data.awards}
            emptyEntry={{ title: "", description: "" }}
            titleForEntry={(entry, index) => entry.title || `Award ${index + 1}`}
            fields={(entry, index) => (
              <>
                <Field label="Title" value={entry.title} onChangeText={(value) => updateAward(index, { ...entry, title: value })} />
                <Field label="Description" value={entry.description} multiline onChangeText={(value) => updateAward(index, { ...entry, description: value })} />
              </>
            )}
            onAdd={() => onChange({ ...data, awards: addItem(data.awards, { title: "", description: "" }) })}
            onRemove={(index) => onChange({ ...data, awards: removeItem(data.awards, index) })}
          />
        );
      case "leadership":
        return (
          <SimpleBulletSection
            entries={data.leadership}
            emptyEntry={{ title: "", organization: "", dates: "", bullets: [] }}
            titleForEntry={(entry, index) => entry.title || `Leadership ${index + 1}`}
            fields={(entry, index) => (
              <>
                <DualInput
                  leftLabel="Title"
                  rightLabel="Organization"
                  leftValue={entry.title}
                  rightValue={entry.organization}
                  onLeftChange={(value) => updateLeadership(index, { ...entry, title: value })}
                  onRightChange={(value) => updateLeadership(index, { ...entry, organization: value })}
                />
                <Field label="Dates" value={entry.dates} onChangeText={(value) => updateLeadership(index, { ...entry, dates: value })} />
                <Field
                  label="Bullets (one per line)"
                  value={serializeArrayText(entry.bullets)}
                  multiline
                  onChangeText={(value) => updateLeadership(index, { ...entry, bullets: ensureArrayText(value) })}
                />
              </>
            )}
            onAdd={() => onChange({ ...data, leadership: addItem(data.leadership, { title: "", organization: "", dates: "", bullets: [] }) })}
            onRemove={(index) => onChange({ ...data, leadership: removeItem(data.leadership, index) })}
          />
        );
      case "certifications":
        return (
          <SimpleEntrySection
            entries={data.certifications}
            emptyEntry={{ name: "", institution: "", url: "" }}
            titleForEntry={(entry, index) => entry.name || `Certification ${index + 1}`}
            fields={(entry, index) => (
              <>
                <DualInput
                  leftLabel="Certification"
                  rightLabel="Institution"
                  leftValue={entry.name}
                  rightValue={entry.institution}
                  onLeftChange={(value) => updateCertification(index, { ...entry, name: value })}
                  onRightChange={(value) => updateCertification(index, { ...entry, institution: value })}
                />
                <Field label="URL" value={entry.url} onChangeText={(value) => updateCertification(index, { ...entry, url: value })} />
              </>
            )}
            onAdd={() => onChange({ ...data, certifications: addItem(data.certifications, { name: "", institution: "", url: "" }) })}
            onRemove={(index) => onChange({ ...data, certifications: removeItem(data.certifications, index) })}
          />
        );
      case "languages":
        return (
          <SimpleEntrySection
            entries={data.languages}
            emptyEntry={{ name: "", level: "" }}
            titleForEntry={(entry, index) => entry.name || `Language ${index + 1}`}
            fields={(entry, index) => (
              <DualInput
                leftLabel="Language"
                rightLabel="Level"
                leftValue={entry.name}
                rightValue={entry.level}
                onLeftChange={(value) => updateLanguage(index, { ...entry, name: value })}
                onRightChange={(value) => updateLanguage(index, { ...entry, level: value })}
              />
            )}
            onAdd={() => onChange({ ...data, languages: addItem(data.languages, { name: "", level: "" }) })}
            onRemove={(index) => onChange({ ...data, languages: removeItem(data.languages, index) })}
          />
        );
      default:
        return null;
    }
  }

  function updateEducation(index: number, entry: ResumeData["education"][number]) {
    onChange({ ...data, education: updateItem(data.education, index, entry) });
  }

  function updateExperience(index: number, entry: ResumeData["experiences"][number]) {
    onChange({ ...data, experiences: updateItem(data.experiences, index, entry) });
  }

  function updateProject(index: number, entry: ResumeData["projects"][number]) {
    onChange({ ...data, projects: updateItem(data.projects, index, entry) });
  }

  function updateAward(index: number, entry: ResumeData["awards"][number]) {
    onChange({ ...data, awards: updateItem(data.awards, index, entry) });
  }

  function updateLeadership(index: number, entry: ResumeData["leadership"][number]) {
    onChange({ ...data, leadership: updateItem(data.leadership, index, entry) });
  }

  function updateCertification(index: number, entry: ResumeData["certifications"][number]) {
    onChange({ ...data, certifications: updateItem(data.certifications, index, entry) });
  }

  function updateLanguage(index: number, entry: ResumeData["languages"][number]) {
    onChange({ ...data, languages: updateItem(data.languages, index, entry) });
  }

  function Field({
    label,
    value,
    onChangeText,
    multiline,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    multiline?: boolean;
  }) {
    return (
      <View style={styles.fieldWrap}>
        <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12), fontWeight: "600" }}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          placeholder={label}
          placeholderTextColor={theme.palette.muted}
          style={[
            styles.input,
            multiline ? styles.multilineInput : null,
            {
              color: theme.palette.foreground,
              backgroundColor: theme.palette.surface,
              borderColor: theme.palette.divider,
            },
          ]}
        />
      </View>
    );
  }

  function DualInput({
    leftLabel,
    rightLabel,
    leftValue,
    rightValue,
    onLeftChange,
    onRightChange,
  }: {
    leftLabel: string;
    rightLabel: string;
    leftValue: string;
    rightValue: string;
    onLeftChange: (value: string) => void;
    onRightChange: (value: string) => void;
  }) {
    return (
      <View style={styles.dualRow}>
        <View style={styles.flexField}>
          <Field label={leftLabel} value={leftValue} onChangeText={onLeftChange} />
        </View>
        <View style={styles.flexField}>
          <Field label={rightLabel} value={rightValue} onChangeText={onRightChange} />
        </View>
      </View>
    );
  }

  function EntryList<T>({
    entries,
    onAdd,
    renderItem,
  }: {
    entries: T[];
    onAdd: () => void;
    renderItem: (entry: T, index: number) => React.ReactNode;
  }) {
    return (
      <View style={styles.fieldStack}>
        {entries.map((entry, index) => renderItem(entry, index))}
        <AddEntryButton onPress={onAdd} />
      </View>
    );
  }

  function SimpleEntrySection<T extends object>({
    entries,
    emptyEntry,
    titleForEntry,
    fields,
    onAdd,
    onRemove,
  }: {
    entries: T[];
    emptyEntry: T;
    titleForEntry: (entry: T, index: number) => string;
    fields: (entry: T, index: number) => React.ReactNode;
    onAdd: () => void;
    onRemove: (index: number) => void;
  }) {
    return (
      <EntryList
        entries={entries}
        onAdd={onAdd}
        renderItem={(entry, index) => (
          <EntryCard key={`simple-${index}`} title={titleForEntry(entry, index)}>
            {fields(entry, index)}
            <RemoveEntryButton onPress={() => onRemove(index)} />
          </EntryCard>
        )}
      />
    );
  }

  function SimpleBulletSection<T extends { bullets: string[] }>({
    entries,
    titleForEntry,
    fields,
    onAdd,
    onRemove,
  }: {
    entries: T[];
    emptyEntry: T;
    titleForEntry: (entry: T, index: number) => string;
    fields: (entry: T, index: number) => React.ReactNode;
    onAdd: () => void;
    onRemove: (index: number) => void;
  }) {
    return (
      <EntryList
        entries={entries}
        onAdd={onAdd}
        renderItem={(entry, index) => (
          <EntryCard key={`bullet-${index}`} title={titleForEntry(entry, index)}>
            {fields(entry, index)}
            <RemoveEntryButton onPress={() => onRemove(index)} />
          </EntryCard>
        )}
      />
    );
  }

  function EntryCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={[styles.entryCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surface }]}>
        <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(14) }}>{title}</Text>
        {children}
      </View>
    );
  }

  function AddEntryButton({ onPress }: { onPress: () => void }) {
    return (
      <Pressable onPress={onPress} style={[styles.addButton, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surface }]}>
        <Text style={{ color: theme.palette.accent, fontWeight: "700" }}>Add entry</Text>
      </Pressable>
    );
  }

  function RemoveEntryButton({ onPress }: { onPress: () => void }) {
    return (
      <Pressable onPress={onPress} style={styles.removeButton}>
        <Text style={{ color: theme.palette.danger, fontWeight: "600" }}>Remove</Text>
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
  compileButton: {
    alignSelf: "flex-start",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusPanel: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionStack: {
    gap: 12,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  sectionHeaderTitle: {
    flex: 1,
    gap: 4,
  },
  fieldStack: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fieldWrap: {
    gap: 6,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  dualRow: {
    flexDirection: "row",
    gap: 10,
  },
  flexField: {
    flex: 1,
  },
  entryCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  addButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
});
