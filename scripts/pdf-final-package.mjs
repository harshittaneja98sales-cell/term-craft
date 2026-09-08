import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const ink = rgb(0.07, 0.09, 0.16);
const muted = rgb(0.35, 0.42, 0.52);
const teal = rgb(0.04, 0.48, 0.44);
const line = rgb(0.77, 0.82, 0.88);

function cleanText(value, maxLength = 500) {
  return String(value ?? "")
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function formatTimestamp(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? cleanText(value, 80) : parsed.toISOString();
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isPdfFieldCompleted(field, value) {
  if (!value) {
    return false;
  }

  if (field.type === "checkbox") {
    return Boolean(value.checked);
  }

  if (field.type === "signature" || field.type === "initials") {
    return Boolean(value.signatureDataUrl || value.signerName);
  }

  return Boolean(cleanText(value.textValue, 2000));
}

function formatFieldValue(field, value) {
  if (!value) {
    return "";
  }

  if (field.type === "checkbox") {
    return value.checked ? "Yes" : "";
  }

  if (field.type === "date") {
    return cleanText(value.textValue, 80) || formatTimestamp(value.completedAt);
  }

  if (field.type === "signature" || field.type === "initials") {
    return cleanText(value.signerName, 160) || "Signed electronically";
  }

  return cleanText(value.textValue, 2000);
}

function parseDataUrl(dataUrl) {
  const value = typeof dataUrl === "string" ? dataUrl : "";
  const match = value.match(/^data:([^;,]+)(?:;[^,]*)?,(.+)$/);

  if (!match) {
    return null;
  }

  return {
    data: match[2],
    mimeType: match[1].toLowerCase(),
  };
}

function getPlacedFieldBox(page, field) {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const fieldWidth = Number.isFinite(Number(field.width)) ? Number(field.width) : 20;
  const fieldHeight = Number.isFinite(Number(field.height)) ? Number(field.height) : 7;
  const fieldX = Number.isFinite(Number(field.x)) ? Number(field.x) : 0;
  const fieldY = Number.isFinite(Number(field.y)) ? Number(field.y) : 0;
  const width = Math.max(8, (Math.min(Math.max(fieldWidth, 1), 100) / 100) * pageWidth);
  const height = Math.max(8, (Math.min(Math.max(fieldHeight, 1), 100) / 100) * pageHeight);
  const x = Math.min(
    Math.max(0, (Math.min(Math.max(fieldX, 0), 100) / 100) * pageWidth),
    Math.max(0, pageWidth - width),
  );
  const yFromTop = (Math.min(Math.max(fieldY, 0), 100) / 100) * pageHeight;
  const y = Math.min(Math.max(0, pageHeight - yFromTop - height), pageHeight - height);

  return { height, width, x, y };
}

function getTextSize(text, font, maxWidth, initialSize, minSize = 7) {
  let size = initialSize;

  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }

  return size;
}

function wrapText(text, font, fontSize, maxWidth) {
  const words = cleanText(text, 4000).split(" ").filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      return;
    }

    if (current) {
      lines.push(current);
    }

    if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
      current = word;
      return;
    }

    let chunk = "";
    [...word].forEach((char) => {
      const nextChunk = `${chunk}${char}`;
      if (font.widthOfTextAtSize(nextChunk, fontSize) <= maxWidth) {
        chunk = nextChunk;
        return;
      }

      if (chunk) {
        lines.push(chunk);
      }
      chunk = char;
    });
    current = chunk;
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

async function drawSignatureLikeField(pdfDoc, page, field, value, fonts) {
  const box = getPlacedFieldBox(page, field);
  const padding = Math.min(5, box.height * 0.16);
  const dataUrl = parseDataUrl(value?.signatureDataUrl);

  if (dataUrl?.data && dataUrl.mimeType !== "image/svg+xml") {
    try {
      const bytes = Buffer.from(dataUrl.data, "base64");
      const image =
        dataUrl.mimeType === "image/jpeg" || dataUrl.mimeType === "image/jpg"
          ? await pdfDoc.embedJpg(bytes)
          : await pdfDoc.embedPng(bytes);
      const imageDims = image.scale(1);
      const maxWidth = Math.max(1, box.width - padding * 2);
      const maxHeight = Math.max(1, box.height - padding * 2);
      const ratio = Math.min(maxWidth / imageDims.width, maxHeight / imageDims.height);
      const width = imageDims.width * ratio;
      const height = imageDims.height * ratio;

      page.drawImage(image, {
        height,
        width,
        x: box.x + padding,
        y: box.y + (box.height - height) / 2,
      });
      return;
    } catch {
      // Fall through to the text fallback below.
    }
  }

  const text = formatFieldValue(field, value);
  if (!text) {
    return;
  }

  const fontSize = getTextSize(
    text,
    fonts.timesItalic,
    Math.max(1, box.width - padding * 2),
    Math.min(26, Math.max(11, box.height * 0.58)),
    8,
  );

  page.drawText(text, {
    color: ink,
    font: fonts.timesItalic,
    size: fontSize,
    x: box.x + padding,
    y: box.y + Math.max(2, (box.height - fontSize) / 2),
  });
}

function drawTextField(page, field, value, fonts) {
  const box = getPlacedFieldBox(page, field);
  const text = formatFieldValue(field, value);

  if (!text) {
    return;
  }

  const padding = 4;
  const fontSize = Math.min(14, Math.max(7.5, box.height * 0.42));
  const lines = wrapText(text, fonts.helvetica, fontSize, Math.max(1, box.width - padding * 2));
  const lineHeight = fontSize * 1.18;
  const maxLines = Math.max(1, Math.floor((box.height - padding * 2) / lineHeight));

  lines.slice(0, maxLines).forEach((line, index) => {
    page.drawText(line, {
      color: ink,
      font: fonts.helvetica,
      size: fontSize,
      x: box.x + padding,
      y: box.y + box.height - padding - fontSize - index * lineHeight,
    });
  });
}

function drawCheckboxField(page, field, value) {
  const box = getPlacedFieldBox(page, field);
  const size = Math.min(box.width, box.height, 14);
  const x = box.x + Math.max(0, (box.width - size) / 2);
  const y = box.y + Math.max(0, (box.height - size) / 2);

  page.drawRectangle({
    borderColor: teal,
    borderWidth: 1,
    color: rgb(1, 1, 1),
    height: size,
    width: size,
    x,
    y,
  });

  if (!value?.checked) {
    return;
  }

  page.drawLine({
    color: teal,
    end: { x: x + size * 0.42, y: y + size * 0.25 },
    start: { x: x + size * 0.2, y: y + size * 0.48 },
    thickness: 1.6,
  });
  page.drawLine({
    color: teal,
    end: { x: x + size * 0.82, y: y + size * 0.76 },
    start: { x: x + size * 0.42, y: y + size * 0.25 },
    thickness: 1.6,
  });
}

async function overlayCompletedFields(pdfDoc, document, fonts) {
  const pages = pdfDoc.getPages();
  const fields = normalizeArray(document.fields);
  const values = normalizeObject(document.fieldValues);

  for (const field of fields) {
    const page = pages[Math.max(0, Number(field.pageNumber || 1) - 1)];
    const value = values[field.id];

    if (!page || !isPdfFieldCompleted(field, value)) {
      continue;
    }

    if (field.type === "signature" || field.type === "initials") {
      await drawSignatureLikeField(pdfDoc, page, field, value, fonts);
      continue;
    }

    if (field.type === "checkbox") {
      drawCheckboxField(page, field, value);
      continue;
    }

    drawTextField(page, field, value, fonts);
  }
}

function createCertificateWriter(pdfDoc, fonts) {
  const size = [612, 792];
  const marginX = 54;
  const marginBottom = 54;
  let page = pdfDoc.addPage(size);
  let y = 738;

  function ensureSpace(requiredHeight = 20) {
    if (y - requiredHeight >= marginBottom) {
      return;
    }

    page = pdfDoc.addPage(size);
    y = 738;
  }

  function text(value, options = {}) {
    const {
      color = ink,
      font = fonts.helvetica,
      maxWidth = 504,
      size: fontSize = 10,
      x = marginX,
    } = options;
    const lines = wrapText(cleanText(value, 4000), font, fontSize, maxWidth);
    const lineHeight = fontSize * 1.35;

    lines.forEach((line) => {
      ensureSpace(lineHeight + 2);
      page.drawText(line, { color, font, size: fontSize, x, y });
      y -= lineHeight;
    });
  }

  function section(title) {
    ensureSpace(34);
    y -= 10;
    page.drawText(title, {
      color: ink,
      font: fonts.helveticaBold,
      size: 13,
      x: marginX,
      y,
    });
    y -= 13;
    page.drawLine({
      color: line,
      end: { x: marginX + 504, y },
      start: { x: marginX, y },
      thickness: 0.8,
    });
    y -= 14;
  }

  function keyValue(label, value) {
    ensureSpace(18);
    page.drawText(cleanText(label, 60), {
      color: muted,
      font: fonts.helveticaBold,
      size: 9,
      x: marginX,
      y,
    });
    text(cleanText(value, 700) || "Not recorded", {
      color: ink,
      font: fonts.helvetica,
      maxWidth: 350,
      size: 9,
      x: marginX + 150,
    });
    y += 3;
  }

  return {
    keyValue,
    section,
    text,
    title(value) {
      page.drawText(value, {
        color: ink,
        font: fonts.helveticaBold,
        size: 22,
        x: marginX,
        y,
      });
      y -= 20;
    },
  };
}

async function appendAuditCertificate(pdfDoc, document, generatedAt) {
  const fonts = {
    helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
    helveticaBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    timesItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
  };
  const writer = createCertificateWriter(pdfDoc, fonts);
  const fields = normalizeArray(document.fields);
  const values = normalizeObject(document.fieldValues);
  const auditEvents = normalizeArray(document.auditEvents);
  const completedFields = fields.filter((field) => isPdfFieldCompleted(field, values[field.id]));

  writer.title("Term Craft Audit Certificate");
  writer.text(
    "This certificate summarizes the stored signing record for the attached document package.",
    { color: muted, size: 10.5 },
  );

  writer.section("Document");
  writer.keyValue("Title", document.title || document.fileName || "Uploaded PDF");
  writer.keyValue("File name", document.fileName || "uploaded.pdf");
  writer.keyValue("Status", document.status || "Draft");
  writer.keyValue("Generated at", generatedAt);
  writer.keyValue("Signed at", document.signingCompletedAt || "");
  writer.keyValue("Recipient", document.signingRecipientName || document.signingRecipientEmail || "");
  writer.keyValue("Original PDF SHA-256", document.fileHash || "");
  writer.keyValue("Signed record SHA-256", document.documentHash || "");
  writer.keyValue("Pages", String(document.pageCount || ""));
  writer.keyValue("Completed fields", `${completedFields.length} of ${fields.length}`);

  writer.section("Completed Fields");
  if (completedFields.length === 0) {
    writer.text("No completed fields were recorded.", { color: muted, size: 9.5 });
  } else {
    completedFields.slice(0, 80).forEach((field) => {
      const value = values[field.id];
      writer.keyValue(
        `${cleanText(field.label, 36)} | Page ${field.pageNumber}`,
        `${field.type} | ${field.assignee || "unassigned"} | ${formatFieldValue(field, value)} | ${formatTimestamp(value?.completedAt)}`,
      );
    });
  }

  writer.section("Audit Trail");
  if (auditEvents.length === 0) {
    writer.text("No audit events were recorded.", { color: muted, size: 9.5 });
  } else {
    auditEvents.slice(0, 120).forEach((event) => {
      writer.keyValue(
        formatTimestamp(event?.at),
        `${cleanText(event?.actor, 120)} | ${cleanText(event?.action, 120)} | ${cleanText(event?.details, 600)}`,
      );
    });
  }

  return fonts;
}

function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function buildPdfAuditCertificate({ document, generatedAt = new Date().toISOString() }) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${cleanText(document?.title || document?.fileName || "Document")} Audit Certificate`);
  pdfDoc.setAuthor("Term Craft");
  pdfDoc.setSubject("Electronic signature audit certificate");
  await appendAuditCertificate(pdfDoc, document ?? {}, generatedAt);
  const bytes = await pdfDoc.save();
  const buffer = Buffer.from(bytes);

  return {
    buffer,
    packageHash: hashBuffer(buffer),
  };
}

export async function buildFinalSignedPdfPackage({
  document,
  generatedAt = new Date().toISOString(),
  pdfBuffer,
}) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  pdfDoc.setTitle(`${cleanText(document?.title || document?.fileName || "Document")} - Signed Package`);
  pdfDoc.setAuthor("Term Craft");
  pdfDoc.setSubject("Signed PDF package with audit certificate");
  pdfDoc.setProducer("Term Craft");

  const fonts = {
    helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
    helveticaBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    timesItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
  };

  await overlayCompletedFields(pdfDoc, document ?? {}, fonts);
  await appendAuditCertificate(pdfDoc, document ?? {}, generatedAt);

  const bytes = await pdfDoc.save();
  const buffer = Buffer.from(bytes);

  return {
    buffer,
    packageHash: hashBuffer(buffer),
  };
}
