function downloadBytes(bytes, filename, mimeType = 'application/pdf') {
    const blob = new Blob([bytes], { type: mimeType });
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

    const btnText = document.getElementById('btn-text');
    const origText = btnText.innerText;
    btnText.innerText = 'Processing...';

    try {
        if (activeMode === 'merge') {
            if (input.files.length < 2) {
                alert('Please select at least 2 PDF files to merge.');
                btnText.innerText = origText;
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
                btnText.innerText = origText;
                return;
            }

            const newPdf = await PDFLib.PDFDocument.create();
            const pageIndices = [];
            for (let i = startPage - 1; i < endPage; i++) pageIndices.push(i);

            const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach((page) => newPdf.addPage(page));

            const splitBytes = await newPdf.save();
            downloadBytes(splitBytes, `extracted_pages_${startPage}_to_${endPage}.pdf`);

        } else if (activeMode === 'delete') {
            if (pagesToDelete.size === 0) {
                alert('Click on at least one page in the preview stage to delete.');
                btnText.innerText = origText;
                return;
            }

            const arrayBuffer = await input.files[0].arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const totalPages = pdfDoc.getPageCount();

            const pagesToKeep = [];
            for (let i = 1; i <= totalPages; i++) {
                if (!pagesToDelete.has(i)) pagesToKeep.push(i - 1);
            }

            if (pagesToKeep.length === 0) {
                alert('You cannot delete all pages from the document.');
                btnText.innerText = origText;
                return;
            }

            const newPdf = await PDFLib.PDFDocument.create();
            const copiedPages = await newPdf.copyPages(pdfDoc, pagesToKeep);
            copiedPages.forEach(page => newPdf.addPage(page));

            const modifiedBytes = await newPdf.save();
            downloadBytes(modifiedBytes, 'document_pages_removed.pdf');

        } else if (activeMode === 'pdf2img') {
            const arrayBuffer = await input.files[0].arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            const zip = new JSZip();

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: ctx, viewport }).promise;

                const imgDataUrl = canvas.toDataURL('image/png');
                const base64Data = imgDataUrl.replace(/^data:image\/png;base64,/, "");
                zip.file(`page_${i}.png`, base64Data, { base64: true });
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = 'pdf_extracted_images.zip';
            link.click();

        } else if (activeMode === 'pdf2ppt') {
            const arrayBuffer = await input.files[0].arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            const pptx = new PptxGenJS();
            pptx.layout = 'LAYOUT_16x9';

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: ctx, viewport }).promise;

                const imgDataUrl = canvas.toDataURL('image/png');
                
                const slide = pptx.addSlide();
                slide.addImage({
                    data: imgDataUrl,
                    x: 0,
                    y: 0,
                    w: '100%',
                    h: '100%'
                });
            }

            await pptx.writeFile({ fileName: 'converted_presentation.pptx' });

        } else if (activeMode === 'img2pdf') {
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
    } finally {
        btnText.innerText = origText;
    }
}