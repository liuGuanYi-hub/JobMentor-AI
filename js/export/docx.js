// export/docx.js — Word 导出（docx.js）

/**
 * 从简历结构生成 .docx 并下载
 * @param {Object} resume - { basics, competencies, workExperience, projects, skills }
 * @param {string} filename
 */
export async function exportResumeToDocx(resume, filename = "resume.docx", options = {}) {
  if (!window.docx) {
    throw new Error("Word 库未加载，请检查网络");
  }
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = window.docx;
  const template = options.template || "timeline";
  const accent = normalizeColor(options.color || "#5B6CFF");
  const titleColor = template === "github" ? "24292E" : accent;
  const titleAlignment = template === "github" ? AlignmentType.LEFT : AlignmentType.CENTER;

  const children = [];

  // 基本信息
  const name = resume?.basics?.name || "我的简历";
  children.push(new Paragraph({
    children: [new TextRun({ text: name, bold: true, size: 40, color: titleColor, font: template === "github" ? "Courier New" : undefined })],
    alignment: titleAlignment,
    spacing: { after: 120 },
  }));

  const contact = [resume?.basics?.position, resume?.basics?.phone, resume?.basics?.email, resume?.basics?.location]
    .filter(Boolean)
    .join("  |  ");
  if (contact) {
    children.push(new Paragraph({
      children: [new TextRun({ text: contact, size: 20, color: "666666", font: template === "github" ? "Courier New" : undefined })],
      alignment: titleAlignment,
      spacing: { after: 200 },
    }));
  }

  if (resume?.summary) {
    children.push(sectionHeading("个人简介", Paragraph, TextRun, HeadingLevel, accent));
    children.push(new Paragraph({
      children: [new TextRun({ text: resume.summary, size: 20, color: "444444" })],
      spacing: { after: 120 },
    }));
  }

  if (resume?.education) {
    children.push(sectionHeading("教育背景", Paragraph, TextRun, HeadingLevel, accent));
    children.push(new Paragraph({
      children: [new TextRun({ text: resume.education, size: 20, color: "444444" })],
      spacing: { after: 120 },
    }));
  }

  // 核心能力
  if (resume?.competencies?.length) {
    children.push(sectionHeading("核心能力", Paragraph, TextRun, HeadingLevel, accent));
    resume.competencies.forEach((c) => {
      children.push(new Paragraph({
        children: [new TextRun({ text: `• ${c}` })],
        spacing: { after: 60 },
      }));
    });
  }

  // 工作/实习经历
  if (resume?.workExperience?.length) {
    children.push(sectionHeading("工作 / 实习经历", Paragraph, TextRun, HeadingLevel, accent));
    resume.workExperience.forEach((w) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: w.company || "", bold: true, size: 24 }),
          w.role ? new TextRun({ text: ` · ${w.role}`, size: 22, color: "555555" }) : new TextRun({ text: "" }),
        ],
        spacing: { before: 120, after: 40 },
      }));
      if (w.period) {
        children.push(new Paragraph({
          children: [new TextRun({ text: w.period, size: 18, color: "888888" })],
          spacing: { after: 60 },
        }));
      }
      (w.bullets || []).forEach((b) => {
        children.push(new Paragraph({
          children: [new TextRun({ text: `• ${b}` })],
          spacing: { after: 40 },
        }));
      });
    });
  }

  // 项目经历
  if (resume?.projects?.length) {
    children.push(sectionHeading("项目经历", Paragraph, TextRun, HeadingLevel, accent));
    resume.projects.forEach((p) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: p.name || "", bold: true, size: 24 }),
          p.role ? new TextRun({ text: ` · ${p.role}`, size: 22, color: "555555" }) : new TextRun({ text: "" }),
        ],
        spacing: { before: 120, after: 40 },
      }));
      if (p.period) {
        children.push(new Paragraph({
          children: [new TextRun({ text: p.period, size: 18, color: "888888" })],
          spacing: { after: 60 },
        }));
      }
      (p.bullets || []).forEach((b) => {
        children.push(new Paragraph({
          children: [new TextRun({ text: `• ${b}` })],
          spacing: { after: 40 },
        }));
      });
    });
  }

  // 技能
  if (resume?.skills?.length) {
    children.push(sectionHeading("技能工具", Paragraph, TextRun, HeadingLevel, accent));
    children.push(new Paragraph({
      children: [new TextRun({ text: resume.skills.join("  ·  ") })],
      spacing: { after: 40 },
    }));
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return true;
}

function sectionHeading(text, Paragraph, TextRun, HeadingLevel, accent) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, color: normalizeColor(accent) })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    border: {
      bottom: { style: "single", size: 4, color: normalizeColor(accent) },
    },
  });
}

function normalizeColor(color) {
  const value = String(color || "#5B6CFF").replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(value) ? value : "5B6CFF";
}
