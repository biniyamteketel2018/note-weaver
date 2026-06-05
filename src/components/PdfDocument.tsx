import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  Link,
} from "@react-pdf/renderer";
import type { StructuredDocument } from "@/lib/analyze.functions";

// Register editorial-quality fonts (Google Fonts CDN, accessible from worker fetch via @react-pdf).
Font.register({
  family: "Cormorant",
  fonts: [
    { src: "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjQAllvuQWJ5heb_w.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3YmX5slCNuHLi8bLeY9MK7whWMhyjYrEPjuw.ttf", fontWeight: 400, fontStyle: "italic" },
    { src: "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjQHV3uuQWJ5heb_w.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjQDFvuuQWJ5heb_w.ttf", fontWeight: 700 },
  ],
});
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.ttf", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.ttf", fontWeight: 700 },
  ],
});

const INK = "#1a2030";
const PAPER = "#fafaf6";
const RULE = "#d8d4c8";
const GOLD = "#b08a3e";
const MUTED = "#5b6478";
const SAGE = "#5d7a6b";
const CRIMSON = "#8a2a2a";

const s = StyleSheet.create({
  page: {
    backgroundColor: PAPER,
    color: INK,
    paddingTop: 72,
    paddingBottom: 72,
    paddingHorizontal: 64,
    fontFamily: "Inter",
    fontSize: 11,
    lineHeight: 1.6,
  },
  // Cover
  coverPage: {
    backgroundColor: PAPER,
    color: INK,
    padding: 0,
  },
  coverImage: { width: "100%", height: 360, objectFit: "cover" },
  coverBody: { padding: 64, flexGrow: 1, justifyContent: "space-between" },
  coverEyebrow: {
    fontFamily: "Inter",
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: GOLD,
    marginBottom: 24,
  },
  coverTitle: {
    fontFamily: "Cormorant",
    fontWeight: 700,
    fontSize: 56,
    lineHeight: 1.05,
    marginBottom: 18,
  },
  coverSubtitle: {
    fontFamily: "Cormorant",
    fontStyle: "italic",
    fontSize: 20,
    color: MUTED,
    lineHeight: 1.4,
    maxWidth: "85%",
  },
  coverFooter: {
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: MUTED,
  },

  // Section heads
  sectionEyebrow: {
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: GOLD,
    marginBottom: 6,
  },
  h1: { fontFamily: "Cormorant", fontWeight: 700, fontSize: 32, lineHeight: 1.1, marginBottom: 12 },
  h2: { fontFamily: "Cormorant", fontWeight: 700, fontSize: 22, lineHeight: 1.2, marginTop: 24, marginBottom: 10 },
  h3: { fontFamily: "Cormorant", fontWeight: 600, fontSize: 14, marginTop: 12, marginBottom: 6, color: INK },
  intro: {
    fontFamily: "Cormorant",
    fontStyle: "italic",
    fontSize: 14,
    color: MUTED,
    marginBottom: 14,
    lineHeight: 1.5,
  },
  p: { marginBottom: 10, textAlign: "justify" },

  rule: { borderBottomWidth: 0.5, borderBottomColor: RULE, marginVertical: 16 },

  // Callouts
  callout: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    paddingVertical: 10,
    paddingRight: 12,
    marginVertical: 12,
    backgroundColor: "#f3efe4",
  },
  calloutLabel: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
    fontWeight: 700,
  },
  calloutTitle: { fontFamily: "Cormorant", fontWeight: 600, fontSize: 13, marginBottom: 4 },
  calloutBody: { fontSize: 10.5, lineHeight: 1.55 },

  quoteCard: {
    marginVertical: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: INK,
    color: PAPER,
  },
  quoteMark: { fontFamily: "Cormorant", fontSize: 36, color: GOLD, marginBottom: -6 },
  quoteText: { fontFamily: "Cormorant", fontStyle: "italic", fontSize: 16, lineHeight: 1.4, color: PAPER },

  // Timeline
  timelineWrap: { marginVertical: 14, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: GOLD },
  timelineItem: { marginBottom: 10 },
  timelineDate: { fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: GOLD, marginBottom: 2 },
  timelineTitle: { fontFamily: "Cormorant", fontWeight: 600, fontSize: 13, marginBottom: 2 },
  timelineDesc: { fontSize: 10, color: MUTED, lineHeight: 1.5 },

  // Table
  table: { marginVertical: 14, borderTopWidth: 0.5, borderTopColor: INK },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: RULE },
  tableHead: { backgroundColor: "#efeadd" },
  tableCell: { flex: 1, padding: 6, fontSize: 9.5 },
  tableCellHead: { fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8 },
  caption: { fontSize: 8.5, color: MUTED, fontStyle: "italic", marginTop: 4 },

  // Takeaways
  takeawaysBox: {
    marginTop: 14,
    padding: 14,
    backgroundColor: PAPER,
    borderWidth: 0.5,
    borderColor: GOLD,
  },
  takeawaysLabel: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: GOLD,
    marginBottom: 8,
    fontWeight: 700,
  },
  takeawayItem: { flexDirection: "row", marginBottom: 4 },
  takeawayBullet: { width: 12, color: GOLD, fontWeight: 700 },
  takeawayText: { flex: 1, fontSize: 10.5, lineHeight: 1.5 },

  // Header / footer
  header: {
    position: "absolute",
    top: 32,
    left: 64,
    right: 64,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: MUTED,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    paddingBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 64,
    right: 64,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: MUTED,
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    paddingTop: 6,
  },

  // TOC
  tocItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
  },
  tocNum: { color: GOLD, fontWeight: 700, marginRight: 10, fontSize: 11 },
  tocTitle: { fontFamily: "Cormorant", fontSize: 14, flex: 1 },

  refItem: { fontSize: 9.5, color: MUTED, marginBottom: 4 },
});

function calloutStyle(type: string) {
  switch (type) {
    case "important":
      return { borderLeftColor: CRIMSON, bg: "#fbeeee", labelColor: CRIMSON, label: "Important" };
    case "historical":
      return { borderLeftColor: GOLD, bg: "#f5efdd", labelColor: GOLD, label: "Historical Context" };
    case "insight":
      return { borderLeftColor: SAGE, bg: "#eaf1ec", labelColor: SAGE, label: "Key Insight" };
    case "warning":
      return { borderLeftColor: CRIMSON, bg: "#fbeeee", labelColor: CRIMSON, label: "Warning" };
    case "definition":
      return { borderLeftColor: INK, bg: "#efeadd", labelColor: INK, label: "Definition" };
    case "quote":
      return { borderLeftColor: GOLD, bg: INK, labelColor: GOLD, label: "Quote" };
    default:
      return { borderLeftColor: GOLD, bg: "#f3efe4", labelColor: GOLD, label: type };
  }
}

const PageChrome = ({ title }: { title: string }) => (
  <>
    <View style={s.header} fixed>
      <Text>{title}</Text>
      <Text>Generated Document</Text>
    </View>
    <View style={s.footer} fixed>
      <Text>{new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  </>
);

export function PdfDocument({
  doc,
  coverImage,
}: {
  doc: StructuredDocument;
  coverImage?: string | null;
}) {
  return (
    <Document title={doc.title} author="Notable" subject={doc.subtitle}>
      {/* Cover */}
      <Page size="A4" style={s.coverPage}>
        {coverImage ? <Image src={coverImage} style={s.coverImage} /> : <View style={{ height: 200, backgroundColor: INK }} />}
        <View style={s.coverBody}>
          <View>
            <Text style={s.coverEyebrow}>{doc.category} · Educational Brief</Text>
            <Text style={s.coverTitle}>{doc.title}</Text>
            <Text style={s.coverSubtitle}>{doc.subtitle}</Text>
          </View>
          <View style={s.coverFooter}>
            <Text>
              {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </Text>
            <Text>Notable · AI Editorial</Text>
          </View>
        </View>
      </Page>

      {/* Executive summary + TOC */}
      <Page size="A4" style={s.page}>
        <PageChrome title={doc.title} />
        <Text style={s.sectionEyebrow}>Executive Summary</Text>
        <Text style={s.h1}>In Brief</Text>
        <Text style={[s.intro, { marginBottom: 18 }]}>{doc.executiveSummary}</Text>
        <View style={s.rule} />
        <Text style={s.sectionEyebrow}>Contents</Text>
        <Text style={s.h2}>Table of Contents</Text>
        <View>
          {doc.sections.map((sec, i) => (
            <View key={i} style={s.tocItem} wrap={false}>
              <Text style={s.tocNum}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={s.tocTitle}>{sec.heading}</Text>
            </View>
          ))}
        </View>
      </Page>

      {/* Sections */}
      {doc.sections.map((sec, i) => (
        <Page key={i} size="A4" style={s.page}>
          <PageChrome title={doc.title} />
          <Text style={s.sectionEyebrow}>Chapter {String(i + 1).padStart(2, "0")}</Text>
          <Text style={s.h1}>{sec.heading}</Text>
          {sec.intro ? <Text style={s.intro}>{sec.intro}</Text> : null}
          <View style={s.rule} />

          {sec.paragraphs.map((p, j) => (
            <Text key={j} style={s.p}>{p}</Text>
          ))}

          {sec.callouts?.map((c, k) => {
            const cs = calloutStyle(c.type);
            if (c.type === "quote") {
              return (
                <View key={k} style={s.quoteCard} wrap={false}>
                  <Text style={s.quoteMark}>“</Text>
                  <Text style={s.quoteText}>{c.body}</Text>
                  {c.title ? (
                    <Text style={{ marginTop: 6, fontSize: 9, color: GOLD, letterSpacing: 1.5, textTransform: "uppercase" }}>
                      — {c.title}
                    </Text>
                  ) : null}
                </View>
              );
            }
            return (
              <View key={k} style={[s.callout, { borderLeftColor: cs.borderLeftColor, backgroundColor: cs.bg }]} wrap={false}>
                <Text style={[s.calloutLabel, { color: cs.labelColor }]}>{cs.label}</Text>
                {c.title ? <Text style={s.calloutTitle}>{c.title}</Text> : null}
                <Text style={s.calloutBody}>{c.body}</Text>
              </View>
            );
          })}

          {sec.timeline && sec.timeline.length > 0 ? (
            <View wrap={false}>
              <Text style={s.h3}>Timeline</Text>
              <View style={s.timelineWrap}>
                {sec.timeline.map((t, k) => (
                  <View key={k} style={s.timelineItem}>
                    <Text style={s.timelineDate}>{t.date}</Text>
                    <Text style={s.timelineTitle}>{t.title}</Text>
                    {t.description ? <Text style={s.timelineDesc}>{t.description}</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {sec.table ? (
            <View wrap={false}>
              <Text style={s.h3}>{sec.table.caption ?? "Comparison"}</Text>
              <View style={s.table}>
                <View style={[s.tableRow, s.tableHead]}>
                  {sec.table.headers.map((h, k) => (
                    <Text key={k} style={[s.tableCell, s.tableCellHead]}>{h}</Text>
                  ))}
                </View>
                {sec.table.rows.map((row, k) => (
                  <View key={k} style={s.tableRow}>
                    {row.map((cell, m) => (
                      <Text key={m} style={s.tableCell}>{cell}</Text>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {sec.takeaways && sec.takeaways.length > 0 ? (
            <View style={s.takeawaysBox} wrap={false}>
              <Text style={s.takeawaysLabel}>Key Takeaways</Text>
              {sec.takeaways.map((t, k) => (
                <View key={k} style={s.takeawayItem}>
                  <Text style={s.takeawayBullet}>◆</Text>
                  <Text style={s.takeawayText}>{t}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Page>
      ))}

      {/* Final summary + references */}
      <Page size="A4" style={s.page}>
        <PageChrome title={doc.title} />
        <Text style={s.sectionEyebrow}>Conclusion</Text>
        <Text style={s.h1}>Final Summary</Text>
        <View style={s.rule} />
        <Text style={s.p}>{doc.finalSummary}</Text>

        {doc.references && doc.references.length > 0 ? (
          <View style={{ marginTop: 30 }}>
            <Text style={s.sectionEyebrow}>References</Text>
            <Text style={s.h2}>Sources & Further Reading</Text>
            {doc.references.map((r, i) => (
              <Text key={i} style={s.refItem}>
                {i + 1}. {r}
              </Text>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
