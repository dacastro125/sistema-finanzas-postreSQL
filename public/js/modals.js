document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------------
    // Context
    // ------------------------------------
    const token = localStorage.getItem('token');
    if (!token) return;

    // ------------------------------------
    // Modals Handling
    // ------------------------------------
    const accountModal = document.getElementById('accountModal');
    const txModal = document.getElementById('txModal');
    const editTxModal = document.getElementById('editTxModal');

    document.getElementById('editTransactionsBtn')?.addEventListener('click', async () => {
        editTxModal.classList.add('active');
        await loadEditTransactions();
    });

    document.getElementById('closeEditTxModal')?.addEventListener('click', () => {
        editTxModal.classList.remove('active');
    });

    const loadEditTransactions = async () => {
        const listEl = document.getElementById('editTxList');
        if (!listEl) return;
        listEl.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Cargando transacciones...</p>';
        try {
            const resTx = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } });

            // si la API expone transactions OK
            const allTxs = await resTx.json();

            if (!Array.isArray(allTxs) || allTxs.length === 0) {
                listEl.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No hay entradas para editar.</p>';
                return;
            }

            allTxs.sort((a, b) => new Date(b.date) - new Date(a.date));

            listEl.innerHTML = allTxs.map(tx => {
                const isIncome = tx.type === 'income';
                const sign = isIncome ? '+' : '-';
                const dateStr = new Date(tx.date).toLocaleDateString();
                const amountFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tx.amount);

                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface); padding:1rem; border-radius:0.5rem; margin-bottom:0.5rem; border: 1px solid var(--surface-border);">
                        <div>
                            <strong style="display:block; font-size:1.1rem; color:white;">${tx.note || 'Transacción'}</strong>
                            <small style="color:var(--text-muted);">${dateStr} | ${tx.type === 'transfer' ? 'Transferencia' : (isIncome ? 'Ingreso' : 'Gasto')}</small>
                        </div>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span style="font-weight:bold; font-size: 1.1rem; color: ${tx.type === 'transfer' ? 'white' : (isIncome ? 'var(--success)' : 'var(--danger)')}; margin-right: 0.5rem;">${tx.type === 'transfer' ? '' : sign}${amountFormatted}</span>
                            <button type="button" class="modal-edit-btn" data-tx='${JSON.stringify(tx)}' style="background:var(--primary); border:none; color:white; border-radius:6px; padding:0.5rem 1rem; cursor:pointer; font-weight:600; transition:0.2s;" title="Modificar">Modificar</button>
                            <button type="button" class="modal-delete-btn" data-id="${tx.id}" style="background:var(--danger); border:none; color:white; border-radius:6px; padding:0.5rem 1rem; cursor:pointer; font-weight:600; transition:0.2s;" title="Eliminar definitivamente">Eliminar</button>
                        </div>
                    </div>
                `;
            }).join('');

            // Attach edit listeners
            document.querySelectorAll('.modal-edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tx = JSON.parse(e.currentTarget.getAttribute('data-tx'));
                    openEditTransactionForm(tx);
                });
            });

            // Attach direct delete listeners (Skipping native confirm to avoid browser blocking)
            document.querySelectorAll('.modal-delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const targetBtn = e.currentTarget;
                    if (targetBtn.textContent === '¿Seguro?') {
                        // Confirmed second click
                        targetBtn.disabled = true;
                        targetBtn.textContent = 'Borrando...';
                        const txId = targetBtn.getAttribute('data-id');
                        try {
                            const delRes = await fetch(`/api/transactions/${txId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (delRes.ok) {
                                await loadEditTransactions();
                                // trigger dashboard reload globally if func exists
                                if (typeof window.loadDashboardData === 'function') {
                                    window.loadDashboardData();
                                } else {
                                    window.location.reload();
                                }
                            } else {
                                alert('No se pudo eliminar. Activa la consola para ver errores.');
                                targetBtn.disabled = false;
                                targetBtn.textContent = 'Eliminar';
                            }
                        } catch (err) {
                            targetBtn.disabled = false;
                            targetBtn.textContent = 'Eliminar';
                        }
                    } else {
                        // First click
                        targetBtn.textContent = '¿Seguro?';
                        targetBtn.style.background = '#800000'; // Darker red
                        // Timeout to reset to normal if not clicked
                        setTimeout(() => {
                            if (!targetBtn.disabled) {
                                targetBtn.textContent = 'Eliminar';
                                targetBtn.style.background = 'var(--danger)';
                            }
                        }, 3000);
                    }
                });
            });

        } catch (e) {
            console.error('Error fetching/rendering txs for edit:', e);
            listEl.innerHTML = '<p style="color: var(--danger); text-align: center;">Error de red al obtener transacciones.</p>';
        }
    };

    document.getElementById('newAccountBtn').addEventListener('click', () => {
        accountModal.classList.add('active');
    });

    document.getElementById('newTransactionBtn').addEventListener('click', async () => {
        await loadFormsData();
        txModal.classList.add('active');
    });

    document.getElementById('closeAccountModal').addEventListener('click', () => {
        accountModal.classList.remove('active');
    });

    document.getElementById('closeAccountModal').addEventListener('click', () => {
        accountModal.classList.remove('active');
    });

    // Note: closeTxModal logic relies on resetTxFormState down below.

    // ------------------------------------
    // Flow: Load categories and accounts
    // ------------------------------------
    const loadFormsData = async () => {
        const [accRes, catRes] = await Promise.all([
            fetch('/api/accounts', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const accounts = await accRes.json();
        const categories = await catRes.json();

        // Populate accounts
        const txAcc = document.getElementById('txAccount');
        const txTargAcc = document.getElementById('txTargetAccount');
        txAcc.innerHTML = '';
        txTargAcc.innerHTML = '';

        accounts.forEach(a => {
            const op1 = document.createElement('option');
            op1.value = a.id; op1.textContent = a.name; op1.style.color = "black";
            txAcc.appendChild(op1);

            const op2 = document.createElement('option');
            op2.value = a.id; op2.textContent = a.name; op2.style.color = "black";
            txTargAcc.appendChild(op2);
        });

        // Populate categories
        window._categories = categories; // cache
        updateCategoryOptions();
    };

    const updateCategoryOptions = () => {
        if (!window._categories) return;

        const type = document.getElementById('txType').value;
        const txCat = document.getElementById('txCategory');
        txCat.innerHTML = '';

        const targetAccountGroup = document.getElementById('targetAccountGroup');

        if (type === 'transfer') {
            targetAccountGroup.classList.remove('hidden');
            const op = document.createElement('option');
            op.value = 'transfer_cat'; op.textContent = 'Transferencia Interna'; op.style.color = "black";
            txCat.appendChild(op);
        } else {
            targetAccountGroup.classList.add('hidden');
            const filtered = window._categories.filter(c => c.type === type);
            filtered.forEach(c => {
                const op = document.createElement('option');
                op.value = c.id; op.textContent = c.name; op.style.color = "black";
                txCat.appendChild(op);
            });
        }
    };

    document.getElementById('txType').addEventListener('change', updateCategoryOptions);

    // Default dates
    document.getElementById('txDate').valueAsDate = new Date();

    const openEditTransactionForm = async (tx) => {
        if (tx.type === 'transfer') {
            alert('Por el momento la edición de transferencias complejas no está soportada, por favor borra y crea una nueva.');
            return;
        }

        editTxModal.classList.remove('active'); // Close the list modal
        await loadFormsData();                  // Load selects

        // Set the global editing variable
        window._editingTxId = tx.id;

        // Update Modal Title
        document.querySelector('#txModal .modal-title').textContent = 'Modificar Transacción';

        // Ocultar la opción "Transferencia" al editar porque el backend no lo soporta
        const transferOption = document.querySelector('#txType option[value="transfer"]');
        if (transferOption) transferOption.style.display = 'none';

        // Populate fields
        document.getElementById('txType').value = tx.type;
        updateCategoryOptions(); // Ensure categories are loaded for this type

        document.getElementById('txAmount').value = tx.amount;
        document.getElementById('txAccount').value = tx.accountId;
        document.getElementById('txCategory').value = tx.categoryId;

        // Extraer formato YYYY-MM-DD directo del string de la DB sin parsear UTC
        document.getElementById('txDate').value = tx.date.split('T')[0];

        document.getElementById('txNote').value = tx.note || '';

        // Show the form
        txModal.classList.add('active');
    };

    const resetTxFormState = () => {
        window._editingTxId = null;
        document.querySelector('#txModal .modal-title').textContent = 'Registrar Transacción';

        // Restaurar la opción "Transferencia"
        const transferOption = document.querySelector('#txType option[value="transfer"]');
        if (transferOption) transferOption.style.display = 'block';

        document.getElementById('txForm').reset();
        document.getElementById('txDate').valueAsDate = new Date(); // reset default
    };

    // Override original close events to ensure proper cleanup if closing prematurely
    document.getElementById('closeTxModal')?.addEventListener('click', () => {
        txModal.classList.remove('active');
        resetTxFormState();
    });

    // ------------------------------------
    // Submit forms
    // ------------------------------------
    document.getElementById('accountForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('accName').value;
        const type = document.getElementById('accType').value;
        const balance = document.getElementById('accBalance').value;

        await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, type, balance })
        });

        accountModal.classList.remove('active');
        document.getElementById('accountForm').reset();
        window.location.reload(); // Refresh dashboard
    });

    document.getElementById('txForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('txType').value;
        const amount = document.getElementById('txAmount').value;
        const accountId = document.getElementById('txAccount').value;
        const categoryId = document.getElementById('txCategory').value === 'transfer_cat' ? window._categories[0].id : document.getElementById('txCategory').value; // fallback category if transfer
        const dateValue = document.getElementById('txDate').value;
        const date = `${dateValue}T00:00:00.000Z`;
        const note = document.getElementById('txNote').value;
        const targetAccountId = document.getElementById('txTargetAccount').value;

        // basic transfer validation
        if (type === 'transfer' && accountId === targetAccountId) {
            alert('Cuenta de origen y destino no pueden ser la misma.');
            return;
        }

        const payload = { type, amount, accountId, categoryId, date, note };
        if (type === 'transfer') {
            payload.targetAccountId = targetAccountId;
            payload.categoryId = 'cat-exp-4'; // just a fallback
        }

        const method = window._editingTxId ? 'PUT' : 'POST';
        const url = window._editingTxId ? `/api/transactions/${window._editingTxId}` : '/api/transactions';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                try {
                    const data = await res.json();
                    alert(data.error || 'Ocurrió un error al guardar la transacción.');
                } catch (jsonErr) {
                    alert(`El servidor devolvió un error ${res.status} y no se pudo procesar.`);
                }
                return;
            }

            txModal.classList.remove('active');
            resetTxFormState();
            window.location.reload(); // Refresh dashboard
        } catch (error) {
            console.error('Save tx error:', error);
            alert('Error de conexión al servidor al guardar la transacción.');
        }
    });
});
