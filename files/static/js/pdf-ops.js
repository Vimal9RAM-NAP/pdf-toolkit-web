function downloadBytes(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function executePDFOperation() {
    const input = document.getElementById('file-input');
    if (!input.files || input.files.length === 0) {
        alert('Please select files first.');
        return;
    }

    try {
        if (activeMode === 'merge') {
            if (input.files.length < 2) {
                alert('Please select at least 2 PDF files to merge.');
                return;
            }
            const mergedPdf = await PDFLib.PDFDocument.create();
            for (let file of input.files) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }
            const mergedBytes = await mergedPdf.save();
            downloadBytes(mergedBytes, 'merged_document.pdf');

        } else if (activeMode === 'split') {
            const startPage = parseInt(document.getElementById('split-start').value);
            const endPage = parseInt(document.getElementById('split-end').value);

            const arrayBuffer = await input.files[0].arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const totalPages = pdfDoc.getPageCount();

            if (startPage < 1 || endPage > totalPages || startPage > endPage) {
                alert(`Invalid range. Document has ${totalPages} total pages.`);
                return;
            }

            const newPdf = await PDFLib.PDFDocument.create();
            const pageIndices = [];
            for (let i = startPage - 1; i < endPage; i++) pageIndices.push(i);

            const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach((page) => newPdf.addPage(page));

            const splitBytes = await newPdf.save();
            downloadBytes(splitBytes, `extracted_pages_${startPage}_to_${endPage}.pdf`);

        } else if (activeMode === 'img') {
            const pdfDoc = await PDFLib.PDFDocument.create();
            for (let file of input.files) {
                const arrayBuffer = await file.arrayBuffer();
                let image;
                if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                    image = await pdfDoc.embedJpg(arrayBuffer);
                } else if (file.type === 'image/png') {
                    image = await pdfDoc.embedPng(arrayBuffer);
                } else {
                    continue;
                }
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
            }
            const pdfBytes = await pdfDoc.save();
            downloadBytes(pdfBytes, 'converted_images.pdf');
        }
    } catch (err) {
        alert('An error occurred during processing: ' + err.message);
    }
}