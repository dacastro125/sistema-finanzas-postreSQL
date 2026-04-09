window.initPage_transactions = function() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/index.html'; return; }

    // Elements
    const txTableBody = document.getElementById('txTableBody');
    const newTransactionBtn = document.getElementById('newTransactionBtn');
    const txModal = document.getElementById('txModal');
    const closeTxModal = document.getElementById('closeTxModal');
    const txForm = document.getElementById('txForm');
    const modalTitle = document.querySelector('#txModal .modal-title');

    let transactionsData = [];
    let accountsData = [];
    let categoriesData = [];
    let editingTxId = null;

    // Load necessary data for dropdowns
    const loadSelectorsData = async () => {
        try {
            const [accRes, catRes] = await Promise.all([
                fetch('/api/accounts', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            accountsData = await accRes.json();
            categoriesData = await catRes.json();
        } catch (error) {
            console.error('Error fetching selectors', error);
        }
    };

    const populateDropdowns = (typeFilter) => {
        const txAccount = document.getElementById('txAccount');
        const txTargetAccount = document.getElementById('txTargetAccount');
        const txCategory = document.getElementById('txCategory');

        // Accounts
        txAccount.innerHTML = accountsData.map(a => `<option style="color:black" value="${a.id}">${a.name}</option>`).join('');
        txTargetAccount.innerHTML = accountsData.map(a => `<option style="color:black" value="${a.id}">${a.name}</option>`).join('');

        // Categories
        if (typeFilter === 'transfer') {
            txCategory.innerHTML = `<option style="color:black" value="transfer_cat">Transferencia Interna</option>`;
        } else {
            const filtered = categoriesData.filter(c => c.type === typeFilter);
            txCategory.innerHTML = filtered.map(c => `<option style="color:black" value="${c.id}">${c.name}</option>`).join('');
        }
    };

    // UI Handle Transfer Mode
    document.getElementById('txType').addEventListener('change', (e) => {
        const type = e.target.value;
        const targetGroup = document.getElementById('targetAccountGroup');
        const accountLabel = document.getElementById('accountLabel');

        targetGroup.style.display = type === 'transfer' ? 'block' : 'none';
        accountLabel.textContent = type === 'transfer' ? 'Cuenta de Origen' : 'Cuenta';

        populateDropdowns(type);
    });

    const resetForm = () => {
        editingTxId = null;
        modalTitle.textContent = 'Registrar Transacción';
        txForm.reset();
        document.getElementById('txDate').valueAsDate = new Date();
        document.getElementById('txType').dispatchEvent(new Event('change'));

        const transferOption = document.querySelector('#txType option[value="transfer"]');
        if (transferOption) transferOption.style.display = 'block';
    };

    newTransactionBtn.addEventListener('click', async () => {
        await loadSelectorsData(); // need accounts
        if (accountsData.length === 0) {
            alert('Debes crear al menos una cuenta antes de registrar transacciones.');
            return;
        }
        resetForm();
        txModal.classList.add('active');
    });

    closeTxModal.addEventListener('click', () => {
        txModal.classList.remove('active');
        resetForm();
    });

    // Edit Interaction
    const openEditModal = async (id) => {
        await loadSelectorsData();
        const tx = transactionsData.find(t => t.id === id);
        if (!tx) return;
        if (tx.type === 'transfer') {
            alert('Por el momento la edición de transferencias complejas no está soportada.');
            return;
        }

        editingTxId = tx.id;
        modalTitle.textContent = 'Modificar Transacción';

        const transferOption = document.querySelector('#txType option[value="transfer"]');
        if (transferOption) transferOption.style.display = 'none';

        document.getElementById('txType').value = tx.type;
        populateDropdowns(tx.type);

        document.getElementById('txAmount').value = tx.amount;
        document.getElementById('txAccount').value = tx.accountId;
        document.getElementById('txCategory').value = tx.categoryId;

        // Extraer formato YYYY-MM-DD directo del string de la DB sin parsear UTC
        document.getElementById('txDate').value = tx.date.split('T')[0];
        document.getElementById('txNote').value = tx.note || '';

        txModal.classList.add('active');
    };

    // Save Interaction
    txForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('txType').value;
        const amount = document.getElementById('txAmount').value;
        const accountId = document.getElementById('txAccount').value;
        const categoryId = document.getElementById('txCategory').value === 'transfer_cat' ? categoriesData[0].id : document.getElementById('txCategory').value;
        const dateValue = document.getElementById('txDate').value;
        const date = `${dateValue}T00:00:00.000Z`;
        const note = document.getElementById('txNote').value;
        const targetAccountId = document.getElementById('txTargetAccount').value;

        if (type === 'transfer' && accountId === targetAccountId) {
            alert('Cuenta de origen y destino no pueden ser la misma.');
            return;
        }

        const payload = { type, amount, accountId, categoryId, date, note };
        if (type === 'transfer') {
            payload.targetAccountId = targetAccountId;
            payload.categoryId = 'cat-exp-4'; // Fallback for transfers
        }

        const method = editingTxId ? 'PUT' : 'POST';
        const url = editingTxId ? `/api/transactions/${editingTxId}` : '/api/transactions';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                try {
                    const data = await res.json();
                    alert(data.error || 'Ocurrió un error al guardar la transacción.');
                } catch {
                    alert(`El servidor devolvió un error ${res.status} y no se pudo procesar.`);
                }
                return;
            }

            txModal.classList.remove('active');
            loadTransactions();
        } catch (error) {
            console.error('Save tx error:', error);
            alert('Error de conexión.');
        }
    });

    // Delete Interaction
    const deleteTransaction = async (id) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta transacción permanentemente?')) return;

        try {
            const res = await fetch(`/api/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                try {
                    const data = await res.json();
                    alert(data.error);
                } catch {
                    alert(`El servidor devolvió un error ${res.status}.`);
                }
                return;
            }

            loadTransactions();
        } catch (error) {
            console.error('Delete tx error:', error);
            alert('Error al conectar con el servidor.');
        }
    };

    // Load Transactions & Chart
    const loadTransactions = async () => {
        try {
            await loadSelectorsData(); // Need categories and accounts for mapping
            const res = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Error fetching');
            transactionsData = await res.json();

            transactionsData.sort((a, b) => new Date(b.date) - new Date(a.date));
            renderTable();
            renderChart();
        } catch (error) {
            txTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--danger);">Error al cargar historial.</td></tr>`;
        }
    };

    const renderTable = () => {
        if (transactionsData.length === 0) {
            txTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No hay transacciones registradas.</td></tr>`;
            return;
        }

        const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

        txTableBody.innerHTML = transactionsData.map(tx => {
            const isIncome = tx.type === 'income';
            
            // Forzar fecha neutra neutra para evitar conversiones -5h
            const [y, m, d] = tx.date.split('T')[0].split('-');
            const neutralDate = new Date(y, m - 1, d);
            const dateStr = neutralDate.toLocaleDateString();
            
            const amountFormatted = formatter.format(tx.amount);

            const cat = categoriesData.find(c => c.id === tx.categoryId);
            const acc = accountsData.find(a => a.id === tx.accountId);

            const catName = tx.type === 'transfer' ? 'Transferencia' : (cat ? cat.name : 'Desc.');
            const accName = acc ? acc.name : 'Eliminada';

            return `
                <tr>
                    <td>${dateStr}</td>
                    <td><strong>${tx.note || 'Transacción'}</strong></td>
                    <td style="color: var(--text-muted)">${catName}</td>
                    <td style="color: var(--text-muted)">${accName}</td>
                    <td style="font-weight: 500; color: ${tx.type === 'transfer' ? 'white' : (isIncome ? 'var(--success)' : 'var(--danger)')}">
                        ${tx.type === 'transfer' ? '' : (isIncome ? '+' : '-')}${amountFormatted}
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                        <button class="edit-tx-btn" data-id="${tx.id}" style="background: var(--surface-border); color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; margin-right: 0.5rem; cursor: pointer; transition: 0.2s;" title="Modificar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="del-tx-btn" data-id="${tx.id}" style="background: var(--danger); color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer; transition: 0.2s;" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        document.querySelectorAll('.edit-tx-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openEditModal(e.currentTarget.getAttribute('data-id')));
        });
        document.querySelectorAll('.del-tx-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteTransaction(e.currentTarget.getAttribute('data-id')));
        });
    };

    let txChartInstance = null;
    const renderChart = () => {
        const ctx = document.getElementById('txHistoryChart');
        if (!ctx) return;

        // agrupar por mes
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const incomes = new Array(12).fill(0);
        const expenses = new Array(12).fill(0);

        const currentYear = new Date().getFullYear();

        transactionsData.forEach(tx => {
            const [y, m, d] = tx.date.split('T')[0].split('-');
            const neutralDate = new Date(y, m - 1, d);
            
            if (neutralDate.getFullYear() === currentYear && tx.type !== 'transfer') {
                const mapArr = tx.type === 'income' ? incomes : expenses;
                mapArr[neutralDate.getMonth()] += tx.amount;
            }
        });

        if (txChartInstance) txChartInstance.destroy();

        txChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: incomes,
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    },
                    {
                        label: 'Gastos',
                        data: expenses,
                        backgroundColor: '#ef4444',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: 'white' } },
                    datalabels: { display: false }
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
                    y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    };

    loadTransactions();
};
