pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let activeMode = 'merge';
const fileInput = document.getElementById('file-input');
const fileLabel = document.getElementById('file-label');
const fileSublabel = document.getElementById('file-sublabel');
const dropZone = document.getElementById('drop-zone');
const splitControls = document.getElementById('split-controls');

const emptyState = document.getElementById('empty-state');
const pageGrid = document.getElementById('page-grid');
const metaCount = document.getElementById('meta-count');

function switchMode(mode) {
    activeMode = mode;
    ['merge', 'split', 'img'].forEach(m => {
        const btn = document.getElementById(`mode-${m}-btn`);
        btn.className = 'py-2.5 rounded-lg font-semibold transition-all ' + 
            (m === mode ? 'text-white bg-red-600' : 'text-zinc-400 hover:text-white');
    });

    fileInput.value = '';
    resetStage();

    if (mode === 'merge') {
        fileInput.multiple = true;
        fileInput.accept = 'application/pdf';
        fileSublabel.innerText = 'Select 2 or more PDFs';
        splitControls.classList.add('hidden');
    } else if (mode === 'split') {
        fileInput.multiple = false;
        fileInput.accept = 'application/pdf';
        fileSublabel.innerText = 'Select 1 PDF file to extract pages';
        splitControls.classList.remove('hidden');
    } else if (mode === 'img') {
        fileInput.multiple = true;
        fileInput.accept = 'image/png, image/jpeg, image/jpg';
        fileSublabel.innerText = 'Select JPG or PNG images';
        splitControls.classList.add('hidden');
    }
}

function resetStage() {
    fileLabel.innerText = 'Select files to process';
    emptyState.classList.remove('hidden');
    pageGrid.classList.add('hidden');
    metaCount.classList.add('hidden');
    pageGrid.innerHTML = '';
}

async function renderPDFThumbnails(file) {
    pageGrid.innerHTML = '';
    emptyState.classList.add('hidden');
    pageGrid.classList.remove('hidden');
    metaCount.classList.remove('hidden');

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    metaCount.innerText = `${pdfDoc.numPages} Pages Loaded`;

    document.getElementById('split-end').value = pdfDoc.numPages;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 });

        const card = document.createElement('div');
        card.className = 'bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex flex-col items-center';

        const canvas = document.createElement('canvas');
        canvas.className = 'rounded border border-zinc-800 w-full h-auto';
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: ctx, viewport }).promise;

        const label = document.createElement('span');
        label.className = 'text-[10px] font-mono text-zinc-400 mt-2';
        label.innerText = `Page ${i}`;

        card.appendChild(canvas);
        card.appendChild(label);
        pageGrid.appendChild(card);
    }
}

fileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileLabel.innerText = `${files.length} file(s) selected`;

    if (activeMode === 'split') {
        await renderPDFThumbnails(files[0]);
    }
});


['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('dropzone-active');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dropzone-active');
    }, false);
});

dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt.files.length > 0) {
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change'));
    }
});