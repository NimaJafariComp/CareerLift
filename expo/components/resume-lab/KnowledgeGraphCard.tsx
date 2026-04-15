import React from "react";
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Card } from "@/components/ui/Card";
import { useAppTheme } from "@/lib/theme";
import type { UploadGraphData } from "@/lib/types";
import { asString, stripHtmlToText } from "@/lib/utils";

type GraphNode = {
  id: string;
  label: string;
  type: "person" | "skill" | "experience" | "education" | "job" | "resume";
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  detail: string;
  properties?: Record<string, unknown>;
  size: number;
  fixed?: boolean;
};

type GraphEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
};

export function KnowledgeGraphCard({ graphData }: { graphData: UploadGraphData }) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = React.useState(false);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string>("person");
  const [frameSize, setFrameSize] = React.useState({ width: 0, height: 0 });
  const pan = React.useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = React.useRef(new Animated.Value(1)).current;
  const scaleRef = React.useRef(1);

  const graph = React.useMemo(() => buildGraph(graphData), [graphData]);
  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId) ?? graph.nodes[0];

  React.useEffect(() => {
    if (!expanded || !frameSize.width || !frameSize.height) return;

    const nextScale = Math.min(
      1,
      (frameSize.width - 28) / graph.canvasSize,
      (frameSize.height - 28) / graph.canvasSize
    );
    const safeScale = Math.max(0.34, nextScale);
    scaleRef.current = safeScale;
    scale.setValue(safeScale);
    pan.setValue({ x: 0, y: 0 });
  }, [expanded, frameSize.height, frameSize.width, graph.canvasSize, pan, scale]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: () => {
          pan.flattenOffset();
        },
      }),
    [pan]
  );

  function adjustScale(next: number) {
    scaleRef.current = Math.min(2.2, Math.max(0.38, next));
    Animated.spring(scale, {
      toValue: scaleRef.current,
      useNativeDriver: false,
      damping: 14,
      stiffness: 120,
    }).start();
  }

  function handleCanvasLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    if (width !== frameSize.width || height !== frameSize.height) {
      setFrameSize({ width, height });
    }
  }

  return (
    <Card delay={130}>
      <View style={styles.headerRow}>
        <View style={styles.titleStack}>
          <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(18), fontWeight: "700" }}>Knowledge Graph</Text>
          <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13), lineHeight: theme.text.size(20) }}>
            Pan, zoom, and tap nodes to inspect the structured resume graph extracted from the backend. This view now includes the full available graph instead of a summary subset.
          </Text>
        </View>
        <Pressable onPress={() => setExpanded((value) => !value)}>
          <Text style={{ color: theme.palette.accent, fontWeight: "700" }}>{expanded ? "Collapse" : "Expand"}</Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <SummaryPill label="Resumes" value={graphData.resumes?.length ?? 0} />
        <SummaryPill label="Skills" value={graphData.skills.length} />
        <SummaryPill label="Experience" value={graphData.experiences.length} />
        <SummaryPill label="Education" value={graphData.education.length} />
        <SummaryPill label="Jobs" value={graphData.saved_jobs?.length ?? 0} />
      </View>

      {expanded ? (
        <>
          <View style={styles.controlsRow}>
            <Pressable onPress={() => adjustScale(scaleRef.current - 0.15)} style={[styles.controlChip, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
              <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>Zoom −</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const nextScale = frameSize.width && frameSize.height
                  ? Math.max(
                      0.34,
                      Math.min(
                        1,
                        (frameSize.width - 28) / graph.canvasSize,
                        (frameSize.height - 28) / graph.canvasSize
                      )
                    )
                  : 1;
                pan.setValue({ x: 0, y: 0 });
                adjustScale(nextScale);
              }}
              style={[styles.controlChip, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}
            >
              <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>Reset</Text>
            </Pressable>
            <Pressable onPress={() => adjustScale(scaleRef.current + 0.15)} style={[styles.controlChip, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
              <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>Zoom +</Text>
            </Pressable>
          </View>

          <View
            onLayout={handleCanvasLayout}
            style={[styles.canvasFrame, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}
          >
            <View style={styles.stageCenter}>
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.canvas,
                  {
                    width: graph.canvasSize,
                    height: graph.canvasSize,
                  },
                  {
                    transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
                  },
                ]}
              >
                {graph.edges.map((edge) => {
                  const from = graph.nodes.find((node) => node.id === edge.from);
                  const to = graph.nodes.find((node) => node.id === edge.to);
                  if (!from || !to) return null;

                  const dx = to.x - from.x;
                  const dy = to.y - from.y;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  const angle = `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`;
                  const midX = (from.x + to.x) / 2 - length / 2;
                  const midY = (from.y + to.y) / 2;

                  return (
                    <View
                      key={edge.id}
                      style={[
                        styles.edge,
                        {
                          backgroundColor: theme.palette.divider,
                          width: length,
                          left: midX,
                          top: midY,
                          transform: [{ rotate: angle }],
                        },
                      ]}
                    >
                      {graph.nodes.length <= 18 ? (
                        <Text style={[styles.edgeLabel, { color: theme.palette.muted }]} numberOfLines={1}>
                          {edge.label}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}

                {graph.nodes.map((node) => (
                  <Pressable
                    key={node.id}
                    onPress={() => setSelectedNodeId(node.id)}
                    style={[
                      styles.node,
                      {
                        left: node.x - node.size / 2,
                        top: node.y - node.size / 2,
                        width: node.size,
                        height: node.size,
                        borderRadius: node.size / 2,
                        backgroundColor: getNodeColor(node.type, theme.palette),
                        borderColor: selectedNodeId === node.id ? theme.palette.foreground : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.nodeText,
                        {
                          fontSize: Math.max(8, Math.min(11, node.size / 5.8)),
                        },
                      ]}
                      numberOfLines={3}
                    >
                      {node.label}
                    </Text>
                  </Pressable>
                ))}
              </Animated.View>
            </View>
          </View>

          {selectedNode ? (
            <View style={[styles.detailPanel, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
              <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(14) }}>{selectedNode.label}</Text>
              <Text style={{ color: theme.palette.muted, lineHeight: theme.text.size(20) }}>{selectedNode.detail}</Text>
              {selectedNode.properties ? (
                <ScrollView style={styles.detailScroll} nestedScrollEnabled>
                  <View style={styles.detailStack}>
                    {Object.entries(selectedNode.properties).map(([key, value]) => (
                      <View key={key} style={styles.detailItem}>
                        <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(12) }}>{key}</Text>
                        <Text style={{ color: theme.palette.muted, lineHeight: theme.text.size(18), fontSize: theme.text.size(12) }}>
                          {stripHtmlToText(value)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </Card>
  );

  function SummaryPill({ label, value }: { label: string; value: number }) {
    return (
      <View style={[styles.summaryPill, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
        <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(11) }}>{label}</Text>
        <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>{value}</Text>
      </View>
    );
  }
}

function buildGraph(graphData: UploadGraphData) {
  const totalNodes =
    1 +
    (graphData.resumes?.length ?? 0) +
    graphData.skills.length +
    graphData.experiences.length +
    graphData.education.length +
    (graphData.saved_jobs?.length ?? 0);
  const canvasSize = Math.max(460, Math.min(980, 260 + totalNodes * 34));
  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;
  const outerLimit = canvasSize / 2 - 56;
  const smallNodeSize = totalNodes > 24 ? 38 : totalNodes > 16 ? 44 : 52;
  const mediumNodeSize = totalNodes > 24 ? 46 : 54;

  const nodes: GraphNode[] = [
    {
      id: "person",
      label: truncate(graphData.person.name || "Person", 18),
      type: "person",
      x: centerX,
      y: centerY,
      targetX: centerX,
      targetY: centerY,
      detail: graphData.person.summary || graphData.person.email || graphData.person.location || "Primary resume profile node.",
      properties: graphData.person as Record<string, unknown>,
      size: 68,
      fixed: true,
    },
  ];
  const edges: GraphEdge[] = [];

  function addRingNodes(
    items: Array<{ id: string; label: string; detail: string; type: GraphNode["type"]; properties?: Record<string, unknown>; size?: number; connectFrom?: string; edgeLabel?: string }>,
    radius: number,
    startAngle: number
  ) {
    if (items.length === 0) return;

    const defaultSize = items[0]?.size ?? smallNodeSize;
    const minSpacing = defaultSize + 16;
    const circumference = 2 * Math.PI * radius;
    const capacity = Math.max(4, Math.floor(circumference / minSpacing));
    const layerCount = Math.max(1, Math.ceil(items.length / capacity));
    const radiusStep = defaultSize + 22;

    items.forEach((item, index) => {
      const layerIndex = Math.floor(index / capacity);
      const indexInLayer = index % capacity;
      const layerItems = items.slice(layerIndex * capacity, (layerIndex + 1) * capacity);
      const count = Math.max(layerItems.length, 1);
      const angleOffset = layerIndex % 2 === 0 ? 0 : Math.PI / Math.max(count, 6);
      const angle = startAngle + angleOffset + (Math.PI * 2 * indexInLayer) / count;
      const layerRadius = radius + layerIndex * radiusStep;
      const node: GraphNode = {
        id: item.id,
        label: item.label,
        type: item.type,
        x: centerX + Math.cos(angle) * layerRadius,
        y: centerY + Math.sin(angle) * layerRadius,
        targetX: centerX + Math.cos(angle) * layerRadius,
        targetY: centerY + Math.sin(angle) * layerRadius,
        detail: item.detail,
        properties: item.properties,
        size: item.size ?? smallNodeSize,
      };
      nodes.push(node);
      edges.push({
        id: `edge-${node.id}`,
        from: item.connectFrom || "person",
        to: node.id,
        label: item.edgeLabel || "RELATED_TO",
      });
    });
  }

  const resumeNodes = (graphData.resumes || []).map((resume, index) => ({
    id: `resume:${asString(resume.id || resume.resume_id || resume.name || index)}`,
    label: truncate(asString(resume.name || resume.resume_id || "Resume"), 18),
    detail: `Resume: ${asString(resume.name || resume.resume_id || "Resume")}`,
    type: "resume" as const,
    properties: resume,
    size: mediumNodeSize,
    connectFrom: "person",
    edgeLabel: "HAS_RESUME",
  }));

  addRingNodes(
    resumeNodes,
    Math.min(outerLimit * 0.33, 150),
    -Math.PI / 2
  );

  addRingNodes(
    graphData.skills.map((skill, index) => ({
      id: `skill:${asString(skill) || index}`,
      label: truncate(asString(skill), 16),
      detail: `Skill node: ${asString(skill)}`,
      type: "skill",
      properties: typeof skill === "object" ? (skill as Record<string, unknown>) : { name: asString(skill) },
      edgeLabel: "HAS_SKILL",
    })),
    Math.min(outerLimit * 0.52, 250),
    -Math.PI / 2
  );

  addRingNodes(
    graphData.experiences.map((experience, index) => ({
      id: `experience:${index}`,
      label: truncate(asString(experience.title || experience.company || `Experience ${index + 1}`), 18),
      detail: `${asString(experience.title)}${experience.company ? ` @ ${asString(experience.company)}` : ""}${experience.description ? `\n\n${stripHtmlToText(experience.description)}` : ""}`,
      type: "experience",
      properties: experience as Record<string, unknown>,
      edgeLabel: "HAS_EXPERIENCE",
    })),
    Math.min(outerLimit * 0.7, 330),
    -Math.PI / 3
  );

  addRingNodes(
    graphData.education.map((education, index) => ({
      id: `education:${index}`,
      label: truncate(asString(education.degree || education.institution || `Education ${index + 1}`), 18),
      detail: `${asString(education.institution)} · ${asString(education.year)}`,
      type: "education",
      properties: education as Record<string, unknown>,
      edgeLabel: "HAS_EDUCATION",
    })),
    Math.min(outerLimit * 0.86, 410),
    Math.PI / 5
  );

  const resumeAnchor = resumeNodes[0]?.id || "person";
  addRingNodes(
    (graphData.saved_jobs || []).map((job, index) => ({
      id: `job:${asString(job.apply_url || job.title || index)}`,
      label: truncate(asString(job.title) || asString(job.company) || `Job ${index + 1}`, 18),
      detail: stripHtmlToText(job.description) || asString(job.company) || "Saved job",
      type: "job",
      properties: job as Record<string, unknown>,
      size: mediumNodeSize,
      connectFrom: resumeAnchor,
      edgeLabel: "SAVED_JOB",
    })),
    Math.min(outerLimit, 500),
    Math.PI / 2
  );

  const laidOutNodes = resolveNodeCollisions(nodes, canvasSize, centerX, centerY);

  return { nodes: laidOutNodes, edges, canvasSize };
}

function resolveNodeCollisions(nodes: GraphNode[], canvasSize: number, centerX: number, centerY: number) {
  const padding = 34;
  const next = nodes.map((node) => ({ ...node }));
  const maxRadius = canvasSize / 2 - padding;

  for (let iteration = 0; iteration < 240; iteration += 1) {
    for (let i = 0; i < next.length; i += 1) {
      const a = next[i];
      if (!a.fixed) {
        a.x += (a.targetX - a.x) * 0.08;
        a.y += (a.targetY - a.y) * 0.08;
      }

      for (let j = i + 1; j < next.length; j += 1) {
        const b = next[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const minDistance = a.size / 2 + b.size / 2 + 18;

        if (distance < minDistance) {
          const overlap = (minDistance - distance) / 2;
          const pushX = (dx / distance) * overlap;
          const pushY = (dy / distance) * overlap;

          if (!a.fixed) {
            a.x -= pushX;
            a.y -= pushY;
          }
          if (!b.fixed) {
            b.x += pushX;
            b.y += pushY;
          }
        }
      }
    }

    for (const node of next) {
      if (node.fixed) continue;

      const dx = node.x - centerX;
      const dy = node.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const allowedRadius = Math.max(node.size / 2 + padding, maxRadius - node.size / 2);

      if (distance > allowedRadius) {
        const scaleDown = allowedRadius / distance;
        node.x = centerX + dx * scaleDown;
        node.y = centerY + dy * scaleDown;
      }

      node.x = Math.max(padding + node.size / 2, Math.min(canvasSize - padding - node.size / 2, node.x));
      node.y = Math.max(padding + node.size / 2, Math.min(canvasSize - padding - node.size / 2, node.y));
    }
  }

  return next;
}

function getNodeColor(type: GraphNode["type"], palette: { accentStrong: string; accent: string; success: string; warning: string; surfaceStrong: string; danger: string }) {
  switch (type) {
    case "person":
      return palette.accentStrong;
    case "skill":
      return palette.accent;
    case "experience":
      return palette.success;
    case "education":
      return palette.warning;
    case "resume":
      return palette.danger;
    default:
      return palette.surfaceStrong;
  }
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleStack: {
    flex: 1,
    gap: 6,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryPill: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 76,
    gap: 2,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 8,
  },
  controlChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  canvasFrame: {
    borderWidth: 1,
    borderRadius: 22,
    minHeight: 420,
    overflow: "hidden",
  },
  stageCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {},
  edge: {
    position: "absolute",
    height: 2,
    justifyContent: "center",
  },
  edgeLabel: {
    position: "absolute",
    top: -14,
    left: "50%",
    marginLeft: -32,
    width: 64,
    fontSize: 9,
    textAlign: "center",
  },
  node: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  nodeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  detailPanel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  detailScroll: {
    maxHeight: 180,
  },
  detailStack: {
    gap: 10,
  },
  detailItem: {
    gap: 4,
  },
});
