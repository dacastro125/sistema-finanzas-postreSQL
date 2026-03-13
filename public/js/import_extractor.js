// =========================================================================
//  Bank statement importer logic
//  Appended to transactions.js after main DOMContentLoaded block closes.
// =========================================================================
(function () {
    const token = localStorage.getItem('token');

    // ---- Bank column templates ----
    const BANK_TEMPLATES = {
        bancolombia: { date: 'FECHA', desc: 'DESCRIPCION', amount: 'VALOR', debit: null, credit: null, delimiter: ';', typeCol: 'TIPO DE MOVIMIENTO', debitWord: 'DEBITO' },
        davivienda:  { date: 'FECHA', desc: 'DESCRIPCIÓN', amount: null, debit: 'DÉBITO', credit: 'CRÉDITO', delimiter: ';', typeCol: null, debitWord: null },
        nequi:       { date: 'Fecha', desc: 'Descripción', amount: 'Monto', debit: null, credit: null, delimiter: ',', typeCol: null, debitWord: null },
        nu:          { date: 'Fecha del movimiento', desc: 'Descripción', amount: 'Valor', debit: null, credit: null, delimiter: ',', typeCol: null, debitWord: null },
        bogota:      { date: 'Fecha', desc: 'Descripción', amount: 'Valor', debit: null, credit: null, delimiter: ';', typeCol: 'Tipo', debitWord: 'DEBITO' },
        bbva:        { date: 'FECHA', desc: 'CONCEPTO', amount: 'IMPORTE', debit: null, credit: null, delimiter: ';', typeCol: null, debitWord: null },
        manual:      null
    };


    let selectedBank = null;
    let parsedRows = [];

    const importModal       = document.getElementById('importModal');
    const closeImportModal  = document.getElementById('closeImportModal');
    const importExtractBtn  = document.getElementById('importExtractBtn');
    const dropZone          = document.getElementById('dropZone');
    const csvFileInput      = document.getElementById('csvFileInput');
    const fileNameLabel     = document.getElementById('fileNameLabel');
    const goToStep2Btn      = document.getElementById('goToStep2Btn');
    const backToStep1Btn    = document.getElementById('backToStep1Btn');
    const confirmImportBtn  = document.getElementById('confirmImportBtn');
    const importStep1       = document.getElementById('importStep1');
    const importStep2       = document.getElementById('importStep2');
    const stepDot1          = document.getElementById('stepDot1');
    const stepDot2          = document.getElementById('stepDot2');
    const stepLabel         = document.getElementById('stepLabel');
    const previewTableBody  = document.getElementById('previewTableBody');
    const importCountLabel  = document.getElementById('importCountLabel');
    const importAccountSelect  = document.getElementById('importAccountSelect');
    const importCategorySelect = document.getElementById('importCategorySelect');
    const selectAllRows        = document.getElementById('selectAllRows');
    const manualMapSection     = document.getElementById('manualMapSection');

    if (!importModal) return; // Not on transactions page

    // Open / close
    importExtractBtn.addEventListener('click', () => {
        resetImportModal();
        importModal.classList.add('active');
        loadImportSelectors();
    });
    closeImportModal.addEventListener('click', () => importModal.classList.remove('active'));
    importModal.addEventListener('click', e => { if (e.target === importModal) importModal.classList.remove('active'); });

    // Bank card selection
    document.querySelectorAll('.bank-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.bank-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedBank = card.dataset.bank;
            manualMapSection.style.display = selectedBank === 'manual' ? 'block' : 'none';
            updateNextBtn();
        });
    });

    // Drop zone
    dropZone.addEventListener('click', () => csvFileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFile(e.dataTransfer.files[0]);
    });
    csvFileInput.addEventListener('change', e => handleFile(e.target.files[0]));

    function handleFile(file) {
        if (!file) return;
        fileNameLabel.textContent = `📎 ${file.name}`;
        const reader = new FileReader();
        reader.onload = e => {
            window._csvRawText = e.target.result;
            updateNextBtn();
        };
        reader.readAsText(file, 'UTF-8');
    }

    function updateNextBtn() {
        const ready = selectedBank && window._csvRawText;
        goToStep2Btn.disabled = !ready;
        goToStep2Btn.style.opacity = ready ? '1' : '0.5';
    }

    // Step navigation
    goToStep2Btn.addEventListener('click', () => {
        parsedRows = parseCSV(window._csvRawText, selectedBank);
        if (parsedRows.length === 0) {
            alert('No se encontraron transacciones en el archivo. Verifica el banco seleccionado o usa "Manual".');
            return;
        }
        renderPreview(parsedRows);
        showStep(2);
    });

    backToStep1Btn.addEventListener('click', () => showStep(1));

    // Select all / deselect all
    selectAllRows.addEventListener('change', () => {
        document.querySelectorAll('.row-check').forEach(cb => {
            cb.checked = selectAllRows.checked;
            cb.closest('tr').classList.toggle('row-skip', !selectAllRows.checked);
        });
        updateImportCount();
    });

    function showStep(n) {
        importStep1.classList.toggle('active', n === 1);
        importStep2.classList.toggle('active', n === 2);
        stepDot1.classList.toggle('active', n === 1);
        stepDot2.classList.toggle('active', n === 2);
        stepLabel.textContent = n === 1 ? 'Seleccionar Banco y Archivo' : 'Revisar y Confirmar';
    }

    // ---- CSV Parser ----
    function parseCSV(raw, bank) {
        // Detect delimiter: if more semicolons than commas, use semicolon
        const delimiter = (raw.split(';').length > raw.split(',').length) ? ';' : ',';
        const lines = raw.trim().split(/\r?\n/);
        if (lines.length < 2) return [];

        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').replace(/\uFEFF/g, ''));

        const template = (bank !== 'manual') ? BANK_TEMPLATES[bank] : buildManualTemplate(delimiter);
        if (!template) return [];

        const rows = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Handle CSV values (some wrapped in quotes)
            const vals = splitCSVLine(line, template.delimiter || delimiter);
            const row = {};
            headers.forEach((h, idx) => { row[h] = (vals[idx] || '').trim().replace(/^"|"$/g, ''); });

            // Extract date
            const rawDate = row[template.date];
            if (!rawDate) continue;

            const parsedDate = parseAnyDate(rawDate);
            if (!parsedDate) continue;

            // Extract description
            const note = row[template.desc] || '';

            // Extract amount & type
            let amount = 0;
            let type = 'expense';

            if (template.debit && template.credit) {
                // Separate debit/credit columns
                const debitVal  = parseAmount(row[template.debit]);
                const creditVal = parseAmount(row[template.credit]);
                if (creditVal > 0) { amount = creditVal; type = 'income'; }
                else               { amount = debitVal;  type = 'expense'; }
            } else if (template.amount) {
                const rawAmount = parseAmount(row[template.amount]);
                amount = Math.abs(rawAmount);

                if (template.typeCol) {
                    const txType = (row[template.typeCol] || '').toUpperCase();
                    type = txType.includes(template.debitWord) ? 'expense' : 'income';
                } else {
                    // Negative amount = expense
                    type = rawAmount < 0 ? 'expense' : 'income';
                }
            }

            if (amount <= 0) continue;

            rows.push({ date: parsedDate, note, amount, type });
        }
        return rows;
    }

    function buildManualTemplate(detectedDelimiter) {
        return {
            date:       document.getElementById('manualColFecha').value.trim(),
            desc:       document.getElementById('manualColDesc').value.trim(),
            amount:     document.getElementById('manualColMonto').value.trim() || null,
            debit:      document.getElementById('manualColDebito').value.trim() || null,
            credit:     document.getElementById('manualColCredito').value.trim() || null,
            delimiter:  detectedDelimiter,
            typeCol:    null,
            debitWord:  null
        };
    }

    function splitCSVLine(line, delimiter) {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let c of line) {
            if (c === '"') { inQuotes = !inQuotes; }
            else if (c === delimiter && !inQuotes) { result.push(cur); cur = ''; }
            else { cur += c; }
        }
        result.push(cur);
        return result;
    }

    function parseAmount(str) {
        if (!str) return 0;
        // Remove currency symbols, dots used as thousands, keep minus and decimal comma/dot
        const cleaned = str.replace(/[^0-9,.\-]/g, '').replace(/\.(?=\d{3}(,|$))/g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
    }

    function parseAnyDate(raw) {
        // Formats: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
        let m;
        if ((m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) return `${m[3]}-${m[2]}-${m[1]}`;
        if ((m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)))   return `${m[1]}-${m[2]}-${m[3]}`;
        if ((m = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/)))  return `${m[3]}-${m[2]}-${m[1]}`;
        // Excel serial number (numeric)
        const n = parseInt(raw);
        if (!isNaN(n) && n > 40000 && n < 60000) {
            const d = new Date((n - 25569) * 86400 * 1000);
            return d.toISOString().split('T')[0];
        }
        return null;
    }

    // ---- Render preview table ----
    function renderPreview(rows) {
        const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
        previewTableBody.innerHTML = rows.map((row, idx) => `
            <tr>
                <td><input type="checkbox" class="row-check" data-idx="${idx}" checked></td>
                <td>${row.date}</td>
                <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${row.note || '—'}</td>
                <td class="${row.type === 'income' ? 'tag-income' : 'tag-expense'}">${row.type === 'income' ? 'Ingreso' : 'Gasto'}</td>
                <td>${formatter.format(row.amount)}</td>
            </tr>
        `).join('');

        document.querySelectorAll('.row-check').forEach(cb => {
            cb.addEventListener('change', () => {
                cb.closest('tr').classList.toggle('row-skip', !cb.checked);
                updateImportCount();
            });
        });

        updateImportCount();
    }

    function updateImportCount() {
        const count = document.querySelectorAll('.row-check:checked').length;
        importCountLabel.textContent = count;
    }

    // ---- Confirm import ----
    confirmImportBtn.addEventListener('click', async () => {
        const accountId  = importAccountSelect.value;
        const categoryId = importCategorySelect.value;

        if (!accountId || !categoryId) {
            alert('Selecciona una cuenta y una categoría para continuar.');
            return;
        }

        const selected = [];
        document.querySelectorAll('.row-check:checked').forEach(cb => {
            const idx = parseInt(cb.dataset.idx);
            selected.push(parsedRows[idx]);
        });

        if (selected.length === 0) {
            alert('No hay transacciones seleccionadas.');
            return;
        }

        confirmImportBtn.disabled = true;
        confirmImportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';

        try {
            const res = await fetch('/api/transactions/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    accountId,
                    categoryId,
                    transactions: selected.map(tx => ({
                        date: `${tx.date}T00:00:00.000Z`,
                        amount: tx.amount,
                        type: tx.type,
                        note: tx.note
                    }))
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al importar');

            alert(`✅ ${data.message}`);
            importModal.classList.remove('active');
            // Reload the transaction list
            if (typeof loadTransactions === 'function') loadTransactions();
        } catch (err) {
            console.error(err);
            alert(`Error: ${err.message}`);
        } finally {
            confirmImportBtn.disabled = false;
            confirmImportBtn.innerHTML = '<i class="fas fa-check"></i> Importar <span id="importCountLabel">' + document.querySelectorAll('.row-check:checked').length + '</span> transacciones';
        }
    });

    // ---- Load accounts & categories for step 2 ----
    async function loadImportSelectors() {
        try {
            const [accRes, catRes] = await Promise.all([
                fetch('/api/accounts',   { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/categories', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            const accounts   = await accRes.json();
            const categories = await catRes.json();

            importAccountSelect.innerHTML = accounts.map(a =>
                `<option style="color:black" value="${a.id}">${a.name}</option>`).join('');

            importCategorySelect.innerHTML = categories.map(c =>
                `<option style="color:black" value="${c.id}">${c.name} (${c.type === 'income' ? 'Ingreso' : 'Gasto'})</option>`).join('');
        } catch (e) {
            console.error('Error loading import selectors', e);
        }
    }

    function resetImportModal() {
        selectedBank = null;
        parsedRows = [];
        window._csvRawText = null;
        document.querySelectorAll('.bank-card').forEach(c => c.classList.remove('selected'));
        fileNameLabel.textContent = '';
        csvFileInput.value = '';
        previewTableBody.innerHTML = '';
        manualMapSection.style.display = 'none';
        goToStep2Btn.disabled = true;
        goToStep2Btn.style.opacity = '0.5';
        showStep(1);
    }
})();
