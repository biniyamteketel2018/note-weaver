import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import type { StructuredDocument } from "@/lib/analyze.functions";
import type { Palette } from "@/lib/palettes";
import { DEFAULT_PALETTE } from "@/lib/palettes";

Font.register({
  family: "Times",
  fonts: [
    { src: "Times-Roman" },
    { src: "Times-Italic", fontStyle: "italic" },
    { src: "Times-Bold", fontWeight: 700 },
    { src: "Times-BoldItalic", fontWeight: 700, fontStyle: "italic" },
  ],
});
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Oblique", fontStyle: "italic" },
    { src: "Helvetica-Bold", fontWeight: 700 },
    { src: "Helvetica-BoldOblique", fontWeight: 700, fontStyle: "italic" },
  ],
});



function pickPullQuote(sec: {
  paragraphs: string[];
  callouts?: { type: string; body: string }[];
}): string | null {
  const q = sec.callouts?.find((c) => c.type === "quote");
  if (q?.body) return q.body;
  for (const p of sec.paragraphs) {
    const sentences = p.split(/(?<=[.!?])\s+/);
    const s = sentences.find((x) => x.length > 60 && x.length < 220);
    if (s) return s.trim();
  }
  return null;
}

export function PdfDocument({
  doc,
  coverImage,
  palette = DEFAULT_PALETTE,
}: {
  doc: StructuredDocument;
  coverImage?: string | null;
  palette?: Palette;
}) {
  const { ink, paper, rule, accent, muted, soft, sage, crimson } = palette;

  const s = StyleSheet.create({
    page: {
      backgroundColor: paper,
      color: ink,
      paddingTop: 72,
      paddingBottom: 72,
      paddingHorizontal: 64,
      fontFamily: "Helvetica",
      fontSize: 11,
      lineHeight: 1.6,
    },
    coverPage: { backgroundColor: paper, color: ink, padding: 0 },
    coverImage: { width: "100%", height: 360, objectFit: "cover" },
    coverBody: { padding: 64, flexGrow: 1, justifyContent: "space-between" },
    coverEyebrow: {
      fontFamily: "Helvetica",
      fontSize: 9,
      letterSpacing: 3,
      textTransform: "uppercase",
      color: accent,
      marginBottom: 24,
    },
    coverTitle: { fontFamily: "Times", fontWeight: 700, fontSize: 56, lineHeight: 1.05, marginBottom: 18 },
    coverSubtitle: { fontFamily: "Times", fontStyle: "italic", fontSize: 20, color: muted, lineHeight: 1.4, maxWidth: "85%" },
    coverFooter: {
      borderTopWidth: 0.5,
      borderTopColor: rule,
      paddingTop: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 9,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      color: muted,
    },

    // Chapter opener
    chapterOpener: { backgroundColor: paper, color: ink, padding: 0 },
    chapterHero: { width: "100%", height: 320, objectFit: "cover" },
    chapterHeroFallback: { width: "100%", height: 220, backgroundColor: ink },
    chapterBody: { paddingHorizontal: 64, paddingTop: 36, paddingBottom: 56 },
    chapterEyebrow: {
      fontSize: 9,
      letterSpacing: 3,
      textTransform: "uppercase",
      color: accent,
      marginBottom: 8,
    },
    chapterNumber: {
      fontFamily: "Times",
      fontWeight: 700,
      fontSize: 180,
      lineHeight: 1,
      color: accent,
      opacity: 0.18,
      marginBottom: -40,
      marginTop: -20,
    },
    chapterTitle: { fontFamily: "Times", fontWeight: 700, fontSize: 44, lineHeight: 1.05, marginBottom: 18 },
    pullQuote: {
      fontFamily: "Times",
      fontStyle: "italic",
      fontSize: 20,
      lineHeight: 1.4,
      color: ink,
      borderLeftWidth: 3,
      borderLeftColor: accent,
      paddingLeft: 18,
      marginVertical: 18,
    },
    chapterIntro: {
      fontFamily: "Times",
      fontSize: 14,
      color: muted,
      lineHeight: 1.6,
      marginTop: 8,
    },

    sectionEyebrow: { fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: accent, marginBottom: 6 },
    h1: { fontFamily: "Times", fontWeight: 700, fontSize: 32, lineHeight: 1.1, marginBottom: 12 },
    h2: { fontFamily: "Times", fontWeight: 700, fontSize: 22, lineHeight: 1.2, marginTop: 24, marginBottom: 10 },
    h3: { fontFamily: "Times", fontWeight: 600, fontSize: 14, marginTop: 12, marginBottom: 6, color: ink },
    intro: { fontFamily: "Times", fontStyle: "italic", fontSize: 14, color: muted, marginBottom: 14, lineHeight: 1.5 },
    p: { marginBottom: 10, textAlign: "justify" },
    rule: { borderBottomWidth: 0.5, borderBottomColor: rule, marginVertical: 16 },

    callout: {
      borderLeftWidth: 3,
      paddingLeft: 14,
      paddingVertical: 10,
      paddingRight: 12,
      marginVertical: 12,
      backgroundColor: soft,
    },
    calloutLabel: { fontSize: 8, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4, fontWeight: 700 },
    calloutTitle: { fontFamily: "Times", fontWeight: 600, fontSize: 13, marginBottom: 4 },
    calloutBody: { fontSize: 10.5, lineHeight: 1.55 },

    // Giant centered quote page
    quotePage: {
      backgroundColor: ink,
      color: paper,
      padding: 80,
      justifyContent: "center",
      alignItems: "center",
    },
    quoteBigMark: { fontFamily: "Times", fontSize: 120, color: accent, lineHeight: 1, marginBottom: -20 },
    quoteBigText: {
      fontFamily: "Times",
      fontStyle: "italic",
      fontWeight: 700,
      fontSize: 34,
      lineHeight: 1.35,
      color: paper,
      textAlign: "center",
      maxWidth: "85%",
    },
    quoteBigRule: { width: 60, height: 1, backgroundColor: accent, marginTop: 28, marginBottom: 12 },
    quoteBigAttr: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: accent },

    // Visual timeline
    tlSection: { marginVertical: 16 },
    tlHeader: { fontFamily: "Times", fontWeight: 700, fontSize: 18, marginBottom: 14 },
    tlRail: { position: "relative", paddingLeft: 32 },
    tlSpine: { position: "absolute", left: 10, top: 6, bottom: 6, width: 2, backgroundColor: accent },
    tlNode: { marginBottom: 14, position: "relative" },
    tlDot: {
      position: "absolute",
      left: -28,
      top: 4,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: paper,
      borderWidth: 2,
      borderColor: accent,
    },
    tlCard: {
      backgroundColor: soft,
      borderLeftWidth: 3,
      borderLeftColor: accent,
      padding: 10,
    },
    tlDate: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: accent, fontWeight: 700, marginBottom: 3 },
    tlTitle: { fontFamily: "Times", fontWeight: 700, fontSize: 13, marginBottom: 2 },
    tlDesc: { fontSize: 10, color: muted, lineHeight: 1.5 },

    // Polished table
    tableWrap: { marginVertical: 16 },
    tableCaption: { fontFamily: "Times", fontWeight: 700, fontSize: 13, marginBottom: 8 },
    table: { borderWidth: 0.5, borderColor: rule },
    tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: rule },
    tableRowAlt: { backgroundColor: soft },
    tableHead: { backgroundColor: ink },
    tableCell: { flex: 1, padding: 8, fontSize: 10, color: ink },
    tableCellHead: { fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: paper },

    takeawaysBox: {
      marginTop: 14,
      padding: 14,
      backgroundColor: paper,
      borderWidth: 0.5,
      borderColor: accent,
    },
    takeawaysLabel: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: accent, marginBottom: 8, fontWeight: 700 },
    takeawayItem: { flexDirection: "row", marginBottom: 4 },
    takeawayBullet: { width: 12, color: accent, fontWeight: 700 },
    takeawayText: { flex: 1, fontSize: 10.5, lineHeight: 1.5 },

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
      color: muted,
      borderBottomWidth: 0.5,
      borderBottomColor: rule,
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
      color: muted,
      borderTopWidth: 0.5,
      borderTopColor: rule,
      paddingTop: 6,
    },

    tocItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: rule },
    tocNum: { color: accent, fontWeight: 700, marginRight: 10, fontSize: 11 },
    tocTitle: { fontFamily: "Times", fontSize: 14, flex: 1 },
    refItem: { fontSize: 9.5, color: muted, marginBottom: 4 },
  });

  function calloutStyle(type: string) {
    switch (type) {
      case "important":
        return { borderLeftColor: crimson, bg: soft, labelColor: crimson, label: "Important" };
      case "historical":
        return { borderLeftColor: accent, bg: soft, labelColor: accent, label: "Historical Context" };
      case "insight":
        return { borderLeftColor: sage, bg: soft, labelColor: sage, label: "Key Insight" };
      case "warning":
        return { borderLeftColor: crimson, bg: soft, labelColor: crimson, label: "Warning" };
      case "definition":
        return { borderLeftColor: ink, bg: soft, labelColor: ink, label: "Definition" };
      default:
        return { borderLeftColor: accent, bg: soft, labelColor: accent, label: type };
    }
  }

  const PageChrome = ({ title }: { title: string }) => (
    <>
      <View style={s.header} fixed>
        <Text>{title}</Text>
        <Text>{BYLINE}</Text>
      </View>
      <View style={s.footer} fixed>
        <Text>{new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </>
  );

  return (
    <Document title={doc.title} author="Biniyam Teketel" subject={doc.subtitle}>
      {/* Cover */}
      <Page size="A4" style={s.coverPage}>
        {coverImage ? <Image src={coverImage} style={s.coverImage} /> : <View style={{ height: 200, backgroundColor: ink }} />}
        <View style={s.coverBody}>
          <View>
            <Text style={s.coverEyebrow}>{doc.category}</Text>
            <Text style={s.coverTitle}>{doc.title}</Text>
            <Text style={s.coverSubtitle}>{doc.subtitle}</Text>
          </View>
          <View style={s.coverFooter}>
            <Text>{new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</Text>
            <Text>{BYLINE}</Text>
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

      {/* Sections — each starts with chapter opener page */}
      {doc.sections.map((sec, i) => {
        const num = String(i + 1).padStart(2, "0");
        const pull = pickPullQuote(sec);
        const intro = sec.intro || sec.paragraphs[0] || "";
        const bodyParagraphs = sec.intro ? sec.paragraphs : sec.paragraphs.slice(1);
        const nonQuoteCallouts = sec.callouts?.filter((c) => c.type !== "quote") ?? [];
        const quoteCallouts = sec.callouts?.filter((c) => c.type === "quote") ?? [];

        return (
          <View key={i}>
            {/* Chapter opener page */}
            <Page size="A4" style={s.chapterOpener}>
              {sec.image ? (
                <Image src={sec.image} style={s.chapterHero} />
              ) : (
                <View style={s.chapterHeroFallback} />
              )}
              <View style={s.chapterBody}>
                <Text style={s.chapterEyebrow}>Chapter {num}</Text>
                <Text style={s.chapterNumber}>{num}</Text>
                <Text style={s.chapterTitle}>{sec.heading}</Text>
                {pull ? <Text style={s.pullQuote}>“{pull}”</Text> : null}
                {intro ? <Text style={s.chapterIntro}>{intro}</Text> : null}
              </View>
            </Page>

            {/* Chapter content */}
            <Page size="A4" style={s.page}>
              <PageChrome title={doc.title} />
              {bodyParagraphs.map((p, j) => (
                <Text key={j} style={s.p}>{p}</Text>
              ))}

              {nonQuoteCallouts.map((c, k) => {
                const cs = calloutStyle(c.type);
                return (
                  <View key={k} style={[s.callout, { borderLeftColor: cs.borderLeftColor, backgroundColor: cs.bg }]} wrap={false}>
                    <Text style={[s.calloutLabel, { color: cs.labelColor }]}>{cs.label}</Text>
                    {c.title ? <Text style={s.calloutTitle}>{c.title}</Text> : null}
                    <Text style={s.calloutBody}>{c.body}</Text>
                  </View>
                );
              })}

              {sec.timeline && sec.timeline.length > 0 ? (
                <View style={s.tlSection} wrap={false}>
                  <Text style={s.tlHeader}>Timeline</Text>
                  <View style={s.tlRail}>
                    <View style={s.tlSpine} />
                    {sec.timeline.map((t, k) => (
                      <View key={k} style={s.tlNode} wrap={false}>
                        <View style={s.tlDot} />
                        <View style={s.tlCard}>
                          <Text style={s.tlDate}>{t.date}</Text>
                          <Text style={s.tlTitle}>{t.title}</Text>
                          {t.description ? <Text style={s.tlDesc}>{t.description}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {sec.table ? (
                <View style={s.tableWrap} wrap={false}>
                  <Text style={s.tableCaption}>{sec.table.caption ?? "Comparison"}</Text>
                  <View style={s.table}>
                    <View style={[s.tableRow, s.tableHead]}>
                      {sec.table.headers.map((h, k) => (
                        <Text key={k} style={[s.tableCell, s.tableCellHead]}>{h}</Text>
                      ))}
                    </View>
                    {sec.table.rows.map((row, k) => (
                      <View key={k} style={[s.tableRow, k % 2 === 1 ? s.tableRowAlt : {}]}>
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

            {/* Giant centered quote pages — one page per quote */}
            {quoteCallouts.map((q, k) => (
              <Page key={`q-${k}`} size="A4" style={s.quotePage}>
                <Text style={s.quoteBigMark}>“</Text>
                <Text style={s.quoteBigText}>{q.body}</Text>
                <View style={s.quoteBigRule} />
                <Text style={s.quoteBigAttr}>{q.title || BYLINE}</Text>
              </Page>
            ))}
          </View>
        );
      })}

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
            <Text style={s.h2}>Sources &amp; Further Reading</Text>
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
