// parsers/docx.js — DOCX/DOC 文件转文本

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function parseDocx(file) {
  if (!window.mammoth) throw new Error("mammoth.js 未加载");
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return (result.value || "").trim();
}
