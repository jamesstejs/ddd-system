/**
 * PDF template for DDD protocols (dezinsekce, deratizace, or both).
 *
 * Uses @react-pdf/renderer for serverless-friendly generation.
 * Renders as A4 portrait with company branding.
 * Title adapts: "DERATIZAČNÍ PROTOKOL" / "DEZINSEKČNÍ PROTOKOL" / both sections.
 */

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import path from "path";

// ---------- Types ----------

export interface PdfPostrikPripravek {
  nazev: string;
  ucinna_latka: string | null;
  protilatka: string | null;
  spotreba: string | null;
  koncentrace_procent: number | null;
}

export interface PdfPostrik {
  skudce: string | null;
  plocha_m2: number | null;
  typ_zakroku: string | null;
  poznamka: string | null;
  pripravky: PdfPostrikPripravek[];
}

export interface PdfKlient {
  nazev: string;
  ico: string | null;
  dic: string | null;
  adresa: string | null;
  email: string | null;
  telefon: string | null;
}

export interface PdfObjekt {
  nazev: string;
  adresa: string | null;
}

export interface PdfDeratBod {
  cislo_bodu: string;
  typ_stanicky: string;
  pozer_procent: number;
  stav_stanicky: string;
  pripravek_nazev: string | null;
  okruh_nazev: string | null;
}

export interface PdfDezinsBod {
  cislo_bodu: string;
  typ_lapace: string;
  druh_hmyzu: string | null;
  pocet: number;
  okruh_nazev: string | null;
}

export interface DezinsekniProtokolPdfData {
  cislo_protokolu: string;
  datum_provedeni: string; // formatted date
  zodpovedny_technik: string;
  klient: PdfKlient;
  objekt: PdfObjekt;
  postriky: PdfPostrik[];
  deratBody: PdfDeratBod[];
  dezinsBody: PdfDezinsBod[];
  poznamka: string | null;
  veta_ucinnosti: string | null;
  dalsi_zasah_od: string | null;
  dalsi_zasah_do: string | null;
  bezpecnostni_listy: string[];
}

// ---------- Constants ----------

const DODAVATEL = {
  nazev: "AHELP Group, s.r.o.",
  brand: "Deraplus",
  sidlo: "Dvořákova 475, 252 64 Velké Přílepy",
  ico: "01483056",
  dic: "CZ01483056",
  telefon: "800 130 303",
  email: "info@deraplus.cz",
  web: "www.deraplus.cz",
};

const TYP_ZAKROKU_LABELS: Record<string, string> = {
  postrik: "Postřik",
  ulv: "ULV",
  poprash: "Popraš",
  gelova_nastraha: "Gelová nástraha",
};

const TYP_STANICKY_LABELS: Record<string, string> = {
  zivolovna: "Živolovná",
  mys: "Myš",
  potkan: "Potkan",
  sklopna_mys: "Sklopná myš",
  sklopna_potkan: "Sklopná potkan",
};

const STAV_STANICKY_LABELS: Record<string, string> = {
  zavedena: "Zavedená",
  odcizena: "Odcizená",
  znovu_zavedena: "Znovu zavedená",
  poskozena: "Poškozená",
  ok: "OK",
};

const TYP_LAPACE_LABELS: Record<string, string> = {
  lezouci_hmyz: "Lezoucí hmyz",
  letajici_hmyz: "Létající hmyz",
  lepova: "Lepová",
  elektronicka: "Elektronická",
};

// ---------- Fonts ----------

// Register Roboto font with Czech character support (latin-ext)
const fontsDir = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(fontsDir, "Roboto-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(fontsDir, "Roboto-Bold.ttf"), fontWeight: "bold" },
    {
      src: path.join(fontsDir, "Roboto-Italic.ttf"),
      fontWeight: "normal",
      fontStyle: "italic",
    },
  ],
});

// ---------- Styles ----------

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9,
    padding: 40,
    paddingBottom: 70,
    color: "#1a1a1a",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 12,
  },
  logo: {
    width: 120,
    height: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e40af",
    textAlign: "right",
  },
  headerSubtitle: {
    fontSize: 9,
    color: "#64748b",
    textAlign: "right",
    marginTop: 2,
  },
  // Info row
  infoRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 8,
  },
  infoBoxTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 9,
    lineHeight: 1.5,
    color: "#1a1a1a",
  },
  infoTextBold: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  // Next intervention
  nextIntervention: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
    textAlign: "center",
  },
  nextInterventionLabel: {
    fontSize: 8,
    color: "#166534",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  nextInterventionDate: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#15803d",
  },
  // Section
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e40af",
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
    paddingBottom: 3,
    marginBottom: 6,
  },
  // Table
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableCell: {
    padding: 5,
    fontSize: 8,
  },
  tableCellHeader: {
    padding: 5,
    fontSize: 7,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
  },
  // Columns widths
  col1: { width: "25%" },
  col2: { width: "20%" },
  col3: { width: "20%" },
  col4: { width: "15%" },
  col5: { width: "20%" },
  // Postrik card
  postrikCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  postrikRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  postrikLabel: {
    width: 120,
    fontSize: 8,
    color: "#64748b",
    fontWeight: "bold",
  },
  postrikValue: {
    flex: 1,
    fontSize: 9,
    color: "#1a1a1a",
  },
  // Poznámka
  poznamkaBox: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#fafafa",
    marginBottom: 10,
  },
  // BL list
  blItem: {
    fontSize: 8,
    color: "#475569",
    marginBottom: 2,
    paddingLeft: 8,
  },
  // Derat grid
  deratGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    marginBottom: 8,
  },
  deratCell: {
    width: 36,
    height: 28,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  deratCellNumber: {
    fontSize: 6,
    color: "#64748b",
  },
  deratCellValue: {
    fontSize: 8,
    fontWeight: "bold",
  },
  deratSummary: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  deratSummaryItem: {
    fontSize: 8,
    color: "#475569",
  },
  deratTable: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    marginBottom: 8,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: "#94a3b8",
  },
  footerBrand: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#2563eb",
  },
  // Věta účinnosti
  vetaBox: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#eff6ff",
    marginBottom: 10,
  },
  vetaText: {
    fontSize: 9,
    color: "#1e3a5f",
    fontStyle: "italic",
  },
});

// ---------- Component ----------

export function DezinsekniProtokolPdf({
  data,
  logoPath,
}: {
  data: DezinsekniProtokolPdfData;
  logoPath?: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {logoPath ? (
            <Image style={styles.logo} src={logoPath} />
          ) : (
            <Text style={[styles.headerTitle, { textAlign: "left" }]}>
              {DODAVATEL.brand}
            </Text>
          )}
          <View>
            <Text style={styles.headerTitle}>
              {data.deratBody.length > 0 && data.postriky.length === 0 && data.dezinsBody.length === 0
                ? "DERATIZAČNÍ PROTOKOL"
                : "DEZINSEKČNÍ PROTOKOL"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {data.cislo_protokolu}
            </Text>
          </View>
        </View>

        {/* Meta: datum + technik */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: "bold" }}>Datum provedení: </Text>
            {data.datum_provedeni}
          </Text>
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: "bold" }}>Odpovědný technik: </Text>
            {data.zodpovedny_technik}
          </Text>
        </View>

        {/* Dodavatel / Odběratel */}
        <View style={styles.infoRow}>
          {/* Dodavatel */}
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Dodavatel</Text>
            <Text style={styles.infoTextBold}>{DODAVATEL.nazev}</Text>
            <Text style={styles.infoText}>{DODAVATEL.sidlo}</Text>
            <Text style={styles.infoText}>
              IČO: {DODAVATEL.ico} | DIČ: {DODAVATEL.dic}
            </Text>
            <Text style={styles.infoText}>
              Tel: {DODAVATEL.telefon} | {DODAVATEL.email}
            </Text>
          </View>

          {/* Odběratel */}
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Odběratel</Text>
            <Text style={styles.infoTextBold}>{data.klient.nazev}</Text>
            {data.objekt.nazev && (
              <Text style={styles.infoText}>
                Objekt: {data.objekt.nazev}
              </Text>
            )}
            <Text style={styles.infoText}>
              {data.klient.adresa || data.objekt.adresa || ""}
            </Text>
            {data.klient.ico && (
              <Text style={styles.infoText}>
                IČO: {data.klient.ico}
                {data.klient.dic ? ` | DIČ: ${data.klient.dic}` : ""}
              </Text>
            )}
            {(data.klient.email || data.klient.telefon) && (
              <Text style={styles.infoText}>
                {data.klient.telefon
                  ? `Tel: ${data.klient.telefon}`
                  : ""}
                {data.klient.telefon && data.klient.email ? " | " : ""}
                {data.klient.email || ""}
              </Text>
            )}
          </View>
        </View>

        {/* Rodenticid summary — for derat protocols */}
        {data.deratBody.length > 0 && (() => {
          const pripravky = [...new Set(data.deratBody.map(b => b.pripravek_nazev).filter(Boolean))];
          // Gather ucinna_latka + protilatka from postriky data (they share the same protocol)
          // For derat-only, show summary of rodenticids
          return pripravky.length > 0 ? (
            <View style={[styles.infoBox, { marginBottom: 12 }]}>
              <Text style={styles.infoBoxTitle}>Použitý rodenticid</Text>
              <Text style={styles.infoTextBold}>{pripravky.join(", ")}</Text>
              <View style={{ flexDirection: "row", gap: 16, marginTop: 2 }}>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: "bold" }}>Počet staniček: </Text>
                  {data.deratBody.length}
                </Text>
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: "bold" }}>Průměrný požer: </Text>
                  {Math.round(data.deratBody.reduce((s, b) => s + b.pozer_procent, 0) / data.deratBody.length)} %
                </Text>
              </View>
            </View>
          ) : null;
        })()}

        {/* Další zásah — green highlight */}
        {(data.dalsi_zasah_od || data.dalsi_zasah_do) && (
          <View style={styles.nextIntervention}>
            <Text style={styles.nextInterventionLabel}>
              {data.deratBody.length > 0 && data.postriky.length === 0 && data.dezinsBody.length === 0
                ? "Další kontrola proběhne"
                : "Další zásah proběhne"}
            </Text>
            <Text style={styles.nextInterventionDate}>
              {data.dalsi_zasah_od && data.dalsi_zasah_do
                ? `${data.dalsi_zasah_od} — ${data.dalsi_zasah_do}`
                : data.dalsi_zasah_od || data.dalsi_zasah_do}
            </Text>
          </View>
        )}

        {/* Deratizační body */}
        {data.deratBody.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deratizační monitoring</Text>

            {/* Summary */}
            <View style={styles.deratSummary}>
              <Text style={styles.deratSummaryItem}>
                <Text style={{ fontWeight: "bold" }}>Počet staniček: </Text>
                {data.deratBody.length}
              </Text>
              <Text style={styles.deratSummaryItem}>
                <Text style={{ fontWeight: "bold" }}>Průměrný požer: </Text>
                {Math.round(
                  data.deratBody.reduce((s, b) => s + b.pozer_procent, 0) /
                    data.deratBody.length,
                )}{" "}
                %
              </Text>
              <Text style={styles.deratSummaryItem}>
                <Text style={{ fontWeight: "bold" }}>Přípravek: </Text>
                {[
                  ...new Set(
                    data.deratBody
                      .map((b) => b.pripravek_nazev)
                      .filter(Boolean),
                  ),
                ].join(", ") || "—"}
              </Text>
            </View>

            {/* Grid — požer per bod */}
            <View style={styles.deratGrid}>
              {data.deratBody.map((bod, idx) => {
                const bg =
                  bod.pozer_procent === 0
                    ? "#f0fdf4"
                    : bod.pozer_procent <= 25
                      ? "#fefce8"
                      : bod.pozer_procent <= 50
                        ? "#fff7ed"
                        : bod.pozer_procent <= 75
                          ? "#fef2f2"
                          : "#fecaca";
                const color =
                  bod.pozer_procent === 0
                    ? "#166534"
                    : bod.pozer_procent <= 50
                      ? "#92400e"
                      : "#991b1b";
                return (
                  <View
                    key={idx}
                    style={[styles.deratCell, { backgroundColor: bg }]}
                  >
                    <Text style={styles.deratCellNumber}>
                      {bod.cislo_bodu}
                    </Text>
                    <Text style={[styles.deratCellValue, { color }]}>
                      {bod.pozer_procent}%
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Detail table */}
            <View style={styles.deratTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellHeader, { width: "12%" }]}>
                  Č. bodu
                </Text>
                <Text style={[styles.tableCellHeader, { width: "18%" }]}>
                  Typ staničky
                </Text>
                <Text style={[styles.tableCellHeader, { width: "14%" }]}>
                  Požer
                </Text>
                <Text style={[styles.tableCellHeader, { width: "14%" }]}>
                  Stav
                </Text>
                <Text style={[styles.tableCellHeader, { width: "22%" }]}>
                  Přípravek
                </Text>
                <Text style={[styles.tableCellHeader, { width: "20%" }]}>
                  Okruh
                </Text>
              </View>
              {data.deratBody.map((bod, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text
                    style={[
                      styles.tableCell,
                      { width: "12%", fontWeight: "bold" },
                    ]}
                  >
                    {bod.cislo_bodu}
                  </Text>
                  <Text style={[styles.tableCell, { width: "18%" }]}>
                    {TYP_STANICKY_LABELS[bod.typ_stanicky] || bod.typ_stanicky}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      {
                        width: "14%",
                        fontWeight: "bold",
                        color:
                          bod.pozer_procent === 0
                            ? "#166534"
                            : bod.pozer_procent <= 50
                              ? "#92400e"
                              : "#991b1b",
                      },
                    ]}
                  >
                    {bod.pozer_procent} %
                  </Text>
                  <Text style={[styles.tableCell, { width: "14%" }]}>
                    {STAV_STANICKY_LABELS[bod.stav_stanicky] ||
                      bod.stav_stanicky}
                  </Text>
                  <Text style={[styles.tableCell, { width: "22%" }]}>
                    {bod.pripravek_nazev || "—"}
                  </Text>
                  <Text style={[styles.tableCell, { width: "20%" }]}>
                    {bod.okruh_nazev || "—"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Dezinsekční body (lapače) */}
        {data.dezinsBody.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dezinsekční monitoring</Text>
            <View style={styles.deratTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellHeader, { width: "15%" }]}>
                  Č. bodu
                </Text>
                <Text style={[styles.tableCellHeader, { width: "25%" }]}>
                  Typ lapače
                </Text>
                <Text style={[styles.tableCellHeader, { width: "25%" }]}>
                  Druh hmyzu
                </Text>
                <Text style={[styles.tableCellHeader, { width: "15%" }]}>
                  Počet ks
                </Text>
                <Text style={[styles.tableCellHeader, { width: "20%" }]}>
                  Okruh
                </Text>
              </View>
              {data.dezinsBody.map((bod, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text
                    style={[
                      styles.tableCell,
                      { width: "15%", fontWeight: "bold" },
                    ]}
                  >
                    {bod.cislo_bodu}
                  </Text>
                  <Text style={[styles.tableCell, { width: "25%" }]}>
                    {TYP_LAPACE_LABELS[bod.typ_lapace] || bod.typ_lapace}
                  </Text>
                  <Text style={[styles.tableCell, { width: "25%" }]}>
                    {bod.druh_hmyzu || "—"}
                  </Text>
                  <Text style={[styles.tableCell, { width: "15%" }]}>
                    {bod.pocet}
                  </Text>
                  <Text style={[styles.tableCell, { width: "20%" }]}>
                    {bod.okruh_nazev || "—"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Postřiky */}
        {data.postriky.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Provedené zásahy</Text>

          {data.postriky.map((postrik, idx) => (
            <View key={idx} style={styles.postrikCard}>
              {data.postriky.length > 1 && (
                <Text
                  style={{
                    fontSize: 8,
                    fontWeight: "bold",
                    color: "#64748b",
                    marginBottom: 4,
                  }}
                >
                  Postřik {idx + 1}
                </Text>
              )}

              <View style={styles.postrikRow}>
                <Text style={styles.postrikLabel}>Zásah proti:</Text>
                <Text style={[styles.postrikValue, { fontWeight: "bold" }]}>
                  {postrik.skudce || "—"}
                </Text>
              </View>

              <View style={styles.postrikRow}>
                <Text style={styles.postrikLabel}>Provedený zákrok:</Text>
                <Text style={styles.postrikValue}>
                  {postrik.typ_zakroku
                    ? TYP_ZAKROKU_LABELS[postrik.typ_zakroku] ||
                      postrik.typ_zakroku
                    : "—"}
                </Text>
              </View>

              <View style={styles.postrikRow}>
                <Text style={styles.postrikLabel}>Plocha:</Text>
                <Text style={styles.postrikValue}>
                  {postrik.plocha_m2 ? `${postrik.plocha_m2} m²` : "—"}
                </Text>
              </View>

              {/* Přípravky tabulka */}
              {postrik.pripravky.length > 0 && (
                <View style={[styles.table, { marginTop: 6 }]}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCellHeader, styles.col1]}>
                      Přípravek
                    </Text>
                    <Text style={[styles.tableCellHeader, styles.col2]}>
                      Účinná látka
                    </Text>
                    <Text style={[styles.tableCellHeader, styles.col3]}>
                      Protilátka
                    </Text>
                    <Text style={[styles.tableCellHeader, styles.col4]}>
                      Spotřeba
                    </Text>
                    <Text style={[styles.tableCellHeader, styles.col5]}>
                      Koncentrace
                    </Text>
                  </View>
                  {postrik.pripravky.map((pp, ppIdx) => (
                    <View key={ppIdx} style={styles.tableRow}>
                      <Text
                        style={[
                          styles.tableCell,
                          styles.col1,
                          { fontWeight: "bold" },
                        ]}
                      >
                        {pp.nazev}
                      </Text>
                      <Text style={[styles.tableCell, styles.col2]}>
                        {pp.ucinna_latka || "—"}
                      </Text>
                      <Text style={[styles.tableCell, styles.col3]}>
                        {pp.protilatka || "—"}
                      </Text>
                      <Text style={[styles.tableCell, styles.col4]}>
                        {pp.spotreba || "—"}
                      </Text>
                      <Text style={[styles.tableCell, styles.col5]}>
                        {pp.koncentrace_procent != null
                          ? `${pp.koncentrace_procent} %`
                          : "—"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {postrik.poznamka && (
                <View style={{ marginTop: 4 }}>
                  <Text
                    style={{ fontSize: 8, color: "#64748b", fontStyle: "italic" }}
                  >
                    {postrik.poznamka}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
        )}

        {/* Věta účinnosti */}
        {data.veta_ucinnosti && (
          <View style={styles.vetaBox}>
            <Text
              style={{
                fontSize: 7,
                fontWeight: "bold",
                color: "#1e40af",
                marginBottom: 3,
              }}
            >
              HODNOCENÍ ÚČINNOSTI
            </Text>
            <Text style={styles.vetaText}>{data.veta_ucinnosti}</Text>
          </View>
        )}

        {/* Poznámka */}
        {data.poznamka && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Poznámka</Text>
            <View style={styles.poznamkaBox}>
              <Text style={styles.infoText}>{data.poznamka}</Text>
            </View>
          </View>
        )}

        {/* Bezpečnostní listy */}
        {data.bezpecnostni_listy.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bezpečnostní listy</Text>
            {data.bezpecnostni_listy.map((bl, idx) => (
              <Text key={idx} style={styles.blItem}>
                {"\u2022"} {bl}
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerBrand}>{DODAVATEL.brand}</Text>
            <Text style={styles.footerText}>
              {DODAVATEL.telefon} | {DODAVATEL.email} | {DODAVATEL.web}
            </Text>
          </View>
          <View>
            <Text style={styles.footerText}>
              {data.cislo_protokolu}
            </Text>
            <Text style={styles.footerText}>
              Vygenerováno: {new Date().toLocaleDateString("cs-CZ")}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Helper to build PDF data from raw DB records.
 */
export function buildDezinsekniPdfData(params: {
  protokol: {
    cislo_protokolu: string | null;
    poznamka: string | null;
    veta_ucinnosti: string | null;
    zodpovedny_technik: string | null;
  };
  zasah: {
    datum: string | null;
  };
  klient: {
    nazev: string | null;
    jmeno: string | null;
    prijmeni: string | null;
    ico: string | null;
    dic: string | null;
    adresa: string | null;
    email: string | null;
    telefon: string | null;
  };
  objekt: {
    nazev: string | null;
    adresa: string | null;
  };
  postriky: {
    skudce: string | null;
    plocha_m2: number | null;
    typ_zakroku: string | null;
    poznamka: string | null;
    pripravky: {
      nazev: string;
      ucinna_latka: string | null;
      protilatka: string | null;
      spotreba: string | null;
      koncentrace_procent: number | null;
    }[];
  }[];
  deratBody?: {
    cislo_bodu: string;
    typ_stanicky: string;
    pozer_procent: number;
    stav_stanicky: string;
    pripravek_nazev: string | null;
    okruh_nazev: string | null;
  }[];
  dezinsBody?: {
    cislo_bodu: string;
    typ_lapace: string;
    druh_hmyzu: string | null;
    pocet: number;
    okruh_nazev: string | null;
  }[];
  bezpecnostniListy: string[];
  dalsiZasah: { od: string | null; do: string | null } | null;
}): DezinsekniProtokolPdfData {
  const klientName =
    params.klient.nazev ||
    `${params.klient.prijmeni ?? ""} ${params.klient.jmeno ?? ""}`.trim() ||
    "—";

  const datumFormatted = params.zasah.datum
    ? new Date(params.zasah.datum).toLocaleDateString("cs-CZ", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  return {
    cislo_protokolu: params.protokol.cislo_protokolu || "DRAFT",
    datum_provedeni: datumFormatted,
    zodpovedny_technik:
      params.protokol.zodpovedny_technik || "Pavel Horák",
    klient: {
      nazev: klientName,
      ico: params.klient.ico,
      dic: params.klient.dic,
      adresa: params.klient.adresa,
      email: params.klient.email,
      telefon: params.klient.telefon,
    },
    objekt: {
      nazev: params.objekt.nazev || "",
      adresa: params.objekt.adresa,
    },
    postriky: params.postriky.map((p) => ({
      skudce: p.skudce,
      plocha_m2: p.plocha_m2,
      typ_zakroku: p.typ_zakroku,
      poznamka: p.poznamka,
      pripravky: p.pripravky.map((pp) => ({
        nazev: pp.nazev,
        ucinna_latka: pp.ucinna_latka,
        protilatka: pp.protilatka,
        spotreba: pp.spotreba,
        koncentrace_procent: pp.koncentrace_procent,
      })),
    })),
    deratBody: (params.deratBody || []).map((b) => ({
      cislo_bodu: b.cislo_bodu,
      typ_stanicky: b.typ_stanicky,
      pozer_procent: b.pozer_procent,
      stav_stanicky: b.stav_stanicky,
      pripravek_nazev: b.pripravek_nazev,
      okruh_nazev: b.okruh_nazev,
    })),
    dezinsBody: (params.dezinsBody || []).map((b) => ({
      cislo_bodu: b.cislo_bodu,
      typ_lapace: b.typ_lapace,
      druh_hmyzu: b.druh_hmyzu,
      pocet: b.pocet,
      okruh_nazev: b.okruh_nazev,
    })),
    poznamka: params.protokol.poznamka,
    veta_ucinnosti: params.protokol.veta_ucinnosti,
    dalsi_zasah_od: params.dalsiZasah?.od ?? null,
    dalsi_zasah_do: params.dalsiZasah?.do ?? null,
    bezpecnostni_listy: params.bezpecnostniListy,
  };
}
