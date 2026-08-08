// parsers/pdf.js — PDF 文件转文本

const PDFJS = window.pdfjsLib;
let workerReady = false;

async function setupWorker() {
  if (workerReady || !PDFJS) return;
  PDFJS.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  workerReady = true;
}

/**
 * @param {File|ArrayBuffer} input
 * @returns {Promise<string>}
 */
export async function parsePdf(input) {
  if (!PDFJS) throw new Error("PDF.js 未加载，请检查网络");
  await setupWorker();

  let data;
  if (input instanceof File) {
    data = await input.arrayBuffer();
  } else {
    data = input;
  }

  const pdf = await PDFJS.getDocument({ data }).promise;
  const parts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((it) => it.str).join(" ");
    parts.push(pageText);
  }
  return parts.join("\n\n").trim();
}
