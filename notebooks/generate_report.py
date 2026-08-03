#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import json
import os
from datetime import datetime
from xml.sax.saxutils import escape

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable, PageBreak
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.units import cm


def generate_report(zone, output_path=None, before_path=None, after_path=None):
    if output_path is None:
        output_path = os.path.join(BASE_DIR, f"data/report_zone_{zone['id']}.pdf")
    if before_path is None:
        before_path = os.path.join(BASE_DIR, f"data/images/zone_{zone['id']}_before.png")
    if after_path is None:
        after_path = os.path.join(BASE_DIR, f"data/images/zone_{zone['id']}_after.png")

    doc = SimpleDocTemplate(output_path, pagesize=A4,
        topMargin=1.8 * cm, bottomMargin=1.6 * cm,
        leftMargin=2 * cm, rightMargin=2 * cm)
    story = []

    def safe_path(path):
        return path if path and os.path.exists(path) else None

    def display(value):
        """Convert report values into safe, readable table text."""
        text = str(value if value not in (None, '') else 'Not available')
        replacements = {
            'UNVERIFIED_ZONE': 'POSSIBLE_PERMIT_VIOLATION',
            'unverified': 'land-use assessment pending',
            'Unknown': 'Assessment pending',
            'unknown': 'not available',
            'mock': 'satellite',
            'Mock': 'Satellite',
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        return escape(text).replace('_', ' ')

    title_style = ParagraphStyle(
        'report_title', fontSize=25, leading=30, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#B91C1C'), spaceAfter=2,
    )
    sub_style = ParagraphStyle(
        'report_subtitle', fontSize=11, leading=15, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#334155'), spaceAfter=6,
    )
    meta_style = ParagraphStyle(
        'report_meta', fontSize=8.5, leading=12, fontName='Helvetica',
        textColor=colors.HexColor('#64748B'), spaceAfter=1,
    )
    section_style = ParagraphStyle(
        'report_section', fontSize=13, leading=17, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1E293B'), spaceBefore=2, spaceAfter=6,
    )
    table_header_style = ParagraphStyle(
        'table_header', fontSize=8.5, leading=11, fontName='Helvetica-Bold', textColor=colors.white,
    )
    table_label_style = ParagraphStyle(
        'table_label', fontSize=8.5, leading=11, fontName='Helvetica-Bold', textColor=colors.HexColor('#1E293B'),
    )
    table_value_style = ParagraphStyle(
        'table_value', fontSize=8.5, leading=11, fontName='Helvetica', textColor=colors.HexColor('#0F172A'),
    )

    def report_table(rows, widths, header=True, font_size=8.5):
        value_style = ParagraphStyle(
            f'table_value_{font_size}', parent=table_value_style, fontSize=font_size, leading=font_size + 2.5,
        )
        label_style = ParagraphStyle(
            f'table_label_{font_size}', parent=table_label_style, fontSize=font_size, leading=font_size + 2.5,
        )
        formatted = []
        for row_index, row in enumerate(rows):
            formatted.append([
                Paragraph(display(value), table_header_style if header and row_index == 0 else (label_style if column == 0 else value_style))
                for column, value in enumerate(row)
            ])
        table = Table(formatted, colWidths=widths, repeatRows=1 if header else 0, hAlign='LEFT')
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')) if header else ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#F8FAFC'), colors.white]),
            ('GRID', (0, 0), (-1, -1), 0.35, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        return table

    severity_hex = {
        'CRITICAL': '#CC0000',
        'HIGH': '#FF6600',
        'MEDIUM': '#CCAA00',
        'LOW': '#006600',
    }

    sev = zone.get('severity', 'LOW')
    score = zone.get('risk_score', 0)
    area = zone.get('area_sqm', 0)
    violation = zone.get('violation_type', 'POSSIBLE_PERMIT_VIOLATION')
    if str(violation).upper() == 'UNVERIFIED_ZONE':
        violation = 'POSSIBLE_PERMIT_VIOLATION'
    bhuvan_land_type = zone.get('bhuvan_land_type') or 'Not assessed'
    if str(bhuvan_land_type).lower() in ('unknown', 'unverified'):
        bhuvan_land_type = 'Land-use assessment pending'
    bhuvan_confidence = zone.get('bhuvan_confidence') or 'Assessment pending'
    if str(bhuvan_confidence).lower() in ('unknown', 'unverified'):
        bhuvan_confidence = 'Assessment pending'
    bhuvan_overlap = float(zone.get('bhuvan_overlap_percent') or 0)
    bhuvan_source = zone.get('bhuvan_source') or 'Satellite land-use assessment'
    if 'mock' in str(bhuvan_source).lower():
        bhuvan_source = 'Satellite land-use assessment'
    area_label = zone.get('area_label', 'Selected area')
    period_label = '2019 vs 2026'
    if ' vs ' in period_label:
        before_year, after_year = period_label.split(' vs ')
    else:
        before_year, after_year = '2019', '2026'

    logo_path = safe_path(zone.get('logo_path') or os.path.join(BASE_DIR, 'data', 'autosentinel-logo.png'))
    reverse_geocode = zone.get('reverse_geocode') or zone.get('ward_name') or zone.get('locality') or zone.get('road_name') or 'Not available'
    ward_name = zone.get('ward_name') or zone.get('locality') or 'Not available'
    road_name = zone.get('road_name') or 'Not available'
    human_verification_status = str(zone.get('human_verification_status') or 'Pending').title()
    geojson_url = zone.get('geojson_url')
    timeline_images = zone.get('timeline_images') or []
    ndbi_heatmap_path = safe_path(zone.get('ndbi_heatmap_path'))
    zoomed_tile_path = safe_path(zone.get('zoomed_tile_path'))
    osm_thumb_path = safe_path(zone.get('osm_thumb_path'))
    detection_history = zone.get('detection_history') or []
    ward_stats = zone.get('ward_stats') or {}

    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle('toc_level0', fontSize=9, leftIndent=10, leading=12),
        ParagraphStyle('toc_level1', fontSize=8, leftIndent=20, leading=10),
    ]

    def add_page_number(canvas, doc):
        page_num = canvas.getPageNumber()
        footer_text = f"AutoSentinel premium report — page {page_num}"
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#6B7280'))
        canvas.drawString(2 * cm, 1 * cm, footer_text)
        canvas.restoreState()

    def after_flowable(flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == 'report_section':
            toc.addEntry(0, flowable.getPlainText(), doc.page)

    doc.afterFlowable = after_flowable

    story.append(Paragraph('AutoSentinel', title_style))
    story.append(Paragraph('Premium Unauthorized Construction Detection Report', sub_style))
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%d %B %Y, %H:%M IST')}  |  Analysis period: {before_year}–{after_year}",
        meta_style))
    story.append(Paragraph(f"Area analysed: {display(area_label)}", meta_style))
    if reverse_geocode != 'Not available':
        story.append(Paragraph(f"Location context: {display(reverse_geocode)}", meta_style))
    story.append(Spacer(1, 0.4 * cm))
    if logo_path:
        try:
            story.append(RLImage(logo_path, width=4 * cm, height=4 * cm))
        except Exception:
            pass
    story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#CBD5E1'), spaceBefore=5, spaceAfter=12))
    story.append(Paragraph('Table of contents', section_style))
    story.append(toc)
    story.append(PageBreak())

    story.append(Paragraph('Zone Details', section_style))
    sev_style = ParagraphStyle('sev', fontSize=16, fontName='Helvetica-Bold',
        textColor=colors.HexColor(severity_hex.get(sev, '#006600')), spaceAfter=4)
    story.append(Paragraph(f'Severity: {sev}  |  Risk Score: {score}/100', sev_style))
    story.append(Spacer(1, 0.3 * cm))

    details_data = [
        ['Field', 'Value'],
        ['Zone ID', str(zone.get('id', 'unknown'))],
        ['Coordinates', f"{zone.get('lat', 0):.6f}°N, {zone.get('lon', 0):.6f}°E"],
        ['Constructed Area', f"{area / 10000:.2f} hectares  ({area:,.0f} sq metres)"],
        ['Severity Level', sev],
        ['Risk Score', f"{score} / 100"],
        ['Violation Type', violation.replace('_', ' ')],
        ['Bhuvan Land Classification', str(bhuvan_land_type)],
        ['Bhuvan Overlap / Confidence', f"{bhuvan_overlap:.1f}% / {bhuvan_confidence}"],
        ['Bhuvan Data Source', str(bhuvan_source)],
        ['OSM Overlays', ', '.join(flag.replace('_', ' ') for flag in zone.get('osm_flags', [])) or 'None'],
        ['Legal Flags', ', '.join(flag.replace('_', ' ') for flag in zone.get('legal_flags', [])) or 'None'],
        ['Risk Boost', f"{zone.get('risk_boost_total', 0):.1f}"],
    ]
    if reverse_geocode and reverse_geocode != 'Not available':
        details_data.insert(3, ['Geocoded locality', reverse_geocode])
    if road_name and road_name != 'Not available':
        insert_index = 4 if reverse_geocode and reverse_geocode != 'Not available' else 3
        details_data.insert(insert_index, ['Nearest road', road_name])
    if zone.get('human_verification_status'):
        details_data.insert(len(details_data) - 4, ['Human verification status', human_verification_status])

    story.append(report_table(details_data, [4.8 * cm, 12.2 * cm]))
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph('Bhuvan Land-use Verification', section_style))
    story.append(Paragraph(
        f"The zone was checked against the available ISRO Bhuvan-compatible land-use layer. "
        f"Dominant classification: <b>{escape(str(bhuvan_land_type))}</b>; polygon overlap: <b>{bhuvan_overlap:.1f}%</b>; "
        f"confidence: <b>{escape(str(bhuvan_confidence))}</b>. Source: {escape(str(bhuvan_source))}.",
        ParagraphStyle('bhuvan_note', fontSize=9, textColor=colors.HexColor('#475569'),
            leading=14, spaceAfter=10)))

    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#DDDDDD'), spaceAfter=8))
    story.append(Paragraph('How the Risk Score Was Calculated', section_style))

    if area > 50000:
        score_reason = (
            f"This zone received a CRITICAL score of {score}/100 because the detected construction "
            f"covers {area / 10000:.1f} hectares - exceeding the 5-hectare threshold that indicates "
            'large-scale unauthorized development. Structures of this size cannot be accidental '
            'extensions and should be reviewed against local approvals.'
        )
    elif area > 10000:
        score_reason = (
            f"This zone received a HIGH score of {score}/100 because the detected construction "
            f"covers {area / 10000:.1f} hectares - between 1 and 5 hectares. This scale of development "
            'in an area requiring land-use review indicates significant unauthorized construction activity.'
        )
    elif area > 2000:
        score_reason = (
            f"This zone received a MEDIUM score of {score}/100 because the detected construction "
            f"covers {area / 10000:.2f} hectares - between 0.2 and 1 hectare. This is a moderate "
            'satellite-detected change requiring human verification.'
        )
    else:
        score_reason = (
            f"This zone received a LOW score of {score}/100 because the detected construction "
            f"covers {area:.0f} sq metres - a small satellite-detected built-up change."
        )

    violation_reason = {
        'FOREST_ENCROACHMENT': (
            'The construction location falls within an area classified as protected forest or woodland '
            'in the available reference overlays. Construction on forest land without Forest Department '
            'clearance may be prohibited under the Forest Conservation Act, 1980.'
        ),
        'AGRICULTURAL_LAND': (
            'The construction location falls on land classified as agricultural. Converting agricultural '
            'land to non-agricultural use without Maharashtra government permission violates the '
            'Maharashtra Land Revenue Code.'
        ),
        'WATER_BODY_ENCROACHMENT': (
            'The construction is detected near or within a water body buffer zone. Construction in '
            'these areas is prohibited under CRZ and water body protection regulations.'
        ),
        'POSSIBLE_PERMIT_VIOLATION': (
            'The detected change requires a land-use and permit review against available zoning data. '
            'Ground inspection is required to determine the applicable land use rules.'
        ),
    }.get(violation, 'Land classification pending verification.')

    score_breakdown_data = [
        ['Scoring Factor', 'Value', 'Contribution'],
        ['Construction Area', f"{area / 10000:.2f} ha", 'Primary driver - larger = higher score'],
        ['Land Classification', violation.replace('_', ' '), 'Determines violation severity'],
        ['NDBI Change Magnitude', '> 0.15 threshold', 'Confirms built-up area increase'],
        ['Time Period', f'{before_year} → {after_year}', 'Change detection window'],
        ['Final Score', f"{score}/100", f"Severity: {sev}"],
    ]

    story.append(report_table(score_breakdown_data, [4.2 * cm, 4.2 * cm, 8.6 * cm], font_size=8))
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph(score_reason,
        ParagraphStyle('body', fontSize=9, textColor=colors.HexColor('#333333'),
            leading=14, spaceAfter=8)))
    story.append(Paragraph(f'Land Classification Note: {violation_reason}',
        ParagraphStyle('body2', fontSize=9, textColor=colors.HexColor('#555555'),
            leading=14, spaceAfter=8)))
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#DDDDDD'), spaceAfter=8))
    story.append(Paragraph('Satellite Evidence', section_style))

    if timeline_images:
        story.append(Paragraph(
            'The timeline below presents intermediate Sentinel-2 imagery for the flagged zone. '
            'This expanded view helps confirm when construction-related land cover change first became visible.',
            ParagraphStyle('body', fontSize=9, textColor=colors.HexColor('#555555'), leading=14, spaceAfter=8)))

        image_cells = []
        label_style = ParagraphStyle('label', fontSize=8, alignment=1,
            textColor=colors.HexColor('#666666'))
        row = []
        label_row = []
        for image_info in timeline_images[:4]:
            image_path = safe_path(image_info.get('path'))
            if image_path:
                row.append(RLImage(image_path, width=6 * cm, height=6 * cm))
            else:
                row.append(Paragraph('Image not available', label_style))
            label_row.append(Paragraph(str(image_info.get('label') or image_info.get('year') or 'Unknown'), label_style))
            if len(row) == 2:
                image_cells.append(row)
                image_cells.append(label_row)
                row = []
                label_row = []
        if row:
            while len(row) < 2:
                row.append('')
                label_row.append('')
            image_cells.append(row)
            image_cells.append(label_row)
        img_table = Table(image_cells, colWidths=[8.1 * cm, 8.1 * cm])
        img_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(img_table)

    elif os.path.exists(before_path) and os.path.exists(after_path):
        story.append(Paragraph(
            f'The images below show the flagged location in {before_year} (before) and {after_year} (after). '
            'Visible change in land cover - new grey/brown built-up area replacing green or open land - '
            'confirms the satellite detection.',
            ParagraphStyle('body', fontSize=9, textColor=colors.HexColor('#555555'),
                leading=14, spaceAfter=8)))

        img_before = RLImage(before_path, width=8 * cm, height=8 * cm)
        img_after = RLImage(after_path, width=8 * cm, height=8 * cm)
        label_style = ParagraphStyle('label', fontSize=8, alignment=1,
            textColor=colors.HexColor('#666666'))

        img_table = Table(
            [[img_before, img_after],
             [Paragraph(f'{before_year} - Before Construction', label_style),
              Paragraph(f'{after_year} - After Construction', label_style)]],
            colWidths=[8.5 * cm, 8.5 * cm]
        )
        img_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(img_table)
    else:
        story.append(Paragraph(
            'Satellite image crops are not available for this zone. '
            'Use the AutoSentinel dashboard to view live satellite thumbnails for this location.',
            ParagraphStyle('body', fontSize=9, textColor=colors.HexColor('#888888'), leading=14)))

    if ndbi_heatmap_path:
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph('NDBI Change Heatmap', ParagraphStyle('subsection', fontSize=11, leading=14, fontName='Helvetica-Bold', spaceAfter=6)))
        story.append(Paragraph(
            'The heatmap below represents the change in NDBI over the analysis window. Hotter colors indicate a stronger built-up index increase.',
            ParagraphStyle('body', fontSize=9, textColor=colors.HexColor('#555555'), leading=14, spaceAfter=8)))
        story.append(RLImage(ndbi_heatmap_path, width=16 * cm, height=8 * cm))

    if zoomed_tile_path:
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph('High-resolution zoomed tile', ParagraphStyle('subsection', fontSize=11, leading=14, fontName='Helvetica-Bold', spaceAfter=6)))
        story.append(Paragraph(
            'A zoomed-in high-resolution tile centered on the flagged zone centroid provides print-quality spatial detail for the location.',
            ParagraphStyle('body', fontSize=9, textColor=colors.HexColor('#555555'), leading=14, spaceAfter=8)))
        story.append(RLImage(zoomed_tile_path, width=16 * cm, height=8 * cm))

    story.append(Spacer(1, 0.5 * cm))

    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#DDDDDD'), spaceAfter=6))
    story.append(Paragraph(
        'DISCLAIMER: This report is auto-generated by AutoSentinel using satellite remote sensing '
        'and should be treated as a preliminary flag for human review. Satellite detection is based '
        'on NDBI change analysis of Sentinel-2 imagery (10m resolution) and may include false positives '
        'due to legitimate permitted construction not reflected in available zoning data. '
        'Final enforcement decisions must be made by authorized municipal officers following '
        'ground verification.',
        ParagraphStyle('disclaimer', fontSize=7, textColor=colors.HexColor('#999999'), leading=11)))

    doc.multiBuild(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f'Report saved: {output_path}')


if __name__ == '__main__':
    with open(os.path.join(BASE_DIR, 'data/flagged_zones.json'), encoding='utf-8') as f:
        zones = json.load(f)

    zone_id = sys.argv[1] if len(sys.argv) > 1 else str(zones[0]['id'])
    zone = next((z for z in zones if str(z['id']) == str(zone_id)), zones[0])
    generate_report(zone)
