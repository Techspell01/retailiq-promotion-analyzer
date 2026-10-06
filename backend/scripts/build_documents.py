"""Builds documents/promotion_profiles.pdf from the mock source dataset.

Each profile is the marketing brief for one promotion: objective, audience,
mechanic, channels and planning notes. The layout matches what
services/rag_services/document_loader.py parses: a title line, then
"Promotion ID <id> · <type> · <start> to <end>", then the body, with a
"Promotion Profiles" running header and "Page N" footer.

Run from backend/:  uv run python -m scripts.build_documents
"""

from pathlib import Path

from fpdf import FPDF

from mock_source_api.generator import dataset

OUTPUT = Path("documents") / "promotion_profiles.pdf"


class ProfilesPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, "Promotion Profiles", new_x="LMARGIN", new_y="NEXT", align="R")
        self.ln(2)

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Page {self.page_no()}", align="C")


def field(pdf: FPDF, label: str, text: str):
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(30, 30, 30)
    pdf.write(5.5, f"{label}: ")
    pdf.set_font("Helvetica", "", 10)
    pdf.write(5.5, text)
    pdf.ln(7)


def build() -> Path:
    pdf = ProfilesPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(18, 14, 18)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, "RetailIQ Promotion Profiles", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 5.5, "Marketing briefs for every promotion in the analysis period. Each profile "
                           "records what the promotion set out to do and what the team knew before launch. "
                           "Performance numbers are not included; use the KPI tools for those.")
    pdf.ln(4)

    for profile in dataset().profiles:
        if pdf.get_y() > 220:
            pdf.add_page()
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(0, 110, 90)
        pdf.cell(0, 8, profile["title"], new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9.5)
        pdf.set_text_color(90, 90, 90)
        pdf.cell(0, 6, f"Promotion ID {profile['promotion_id']} · {profile['type']} · "
                       f"{profile['start']} to {profile['end']}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)
        field(pdf, "Objective", profile["objective"])
        field(pdf, "Target audience", profile["audience"])
        field(pdf, "Mechanic", profile["mechanic"])
        field(pdf, "Channels", profile["channels"])
        field(pdf, "Targeted SKUs", "; ".join(profile["targeted"]))
        field(pdf, "Planning notes", " ".join(profile["notes"]))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUTPUT))
    return OUTPUT


if __name__ == "__main__":
    print(f"wrote {build()}")
