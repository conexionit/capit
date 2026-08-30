const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');
const { Document, Packer, Paragraph, ImageRun, HeadingLevel } = require('docx');
const { jsPDF } = require('jspdf');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

// payload = { projectDir, steps: [{ imageDataUrl, texto, duracionSeg, audioPath }] }

function dataUrlToBuffer(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  return Buffer.from(base64, 'base64');
}

async function exportDocx({ projectDir, steps, titulo }) {
  const children = [
    new Paragraph({ text: titulo || 'Manual CAPIT', heading: HeadingLevel.TITLE })
  ];

  steps.forEach((step, i) => {
    children.push(new Paragraph({ text: `Paso ${i + 1}`, heading: HeadingLevel.HEADING_2 }));
    if (step.texto) children.push(new Paragraph(step.texto));
    if (step.imageDataUrl) {
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: dataUrlToBuffer(step.imageDataUrl),
              transformation: { width: 560, height: 350 }
            })
          ]
        })
      );
    }
  });

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);

  const outPath = path.join(projectDir, 'manual-capit.docx');
  fs.writeFileSync(outPath, buffer);
  return outPath;
}

async function exportPdf({ projectDir, steps, titulo }) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 40;

  pdf.setFontSize(20);
  pdf.text(titulo || 'Manual CAPIT', margin, 50);

  steps.forEach((step, i) => {
    if (i > 0) pdf.addPage();
    pdf.setFontSize(14);
    pdf.text(`Paso ${i + 1}`, margin, 80);
    if (step.texto) {
      pdf.setFontSize(11);
      pdf.text(step.texto, margin, 100, { maxWidth: pageWidth - margin * 2 });
    }
    if (step.imageDataUrl) {
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = imgWidth * 0.6;
      pdf.addImage(step.imageDataUrl, 'PNG', margin, 130, imgWidth, imgHeight);
    }
  });

  const outPath = path.join(projectDir, 'manual-capit.pdf');
  fs.writeFileSync(outPath, Buffer.from(pdf.output('arraybuffer')));
  return outPath;
}

async function exportVideo({ projectDir, steps }) {
  const framesDir = path.join(projectDir, '_frames');
  fs.mkdirSync(framesDir, { recursive: true });

  // 1. Escribir cada step aplanado como PNG numerado
  const listFile = path.join(framesDir, 'list.txt');
  const lines = [];
  steps.forEach((step, i) => {
    const framePath = path.join(framesDir, `frame-${String(i + 1).padStart(3, '0')}.png`);
    fs.writeFileSync(framePath, dataUrlToBuffer(step.imageDataUrl));
    const dur = step.duracionSeg || 3;
    lines.push(`file '${framePath.replace(/\\/g, '/')}'`);
    lines.push(`duration ${dur}`);
  });
  // ffmpeg concat demuxer requiere repetir el ultimo archivo sin duration al final
  if (lines.length > 0) {
    const lastFrame = lines[lines.length - 2];
    lines.push(lastFrame);
  }
  fs.writeFileSync(listFile, lines.join('\n'));

  const outPath = path.join(projectDir, 'capit-video.mp4');

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-vsync vfr', '-pix_fmt yuv420p'])
      .output(outPath)
      .on('end', () => resolve(outPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

module.exports = { exportDocx, exportPdf, exportVideo };
