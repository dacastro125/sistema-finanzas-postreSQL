window.initPage_accounts = function() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/index.html'; return; }

    // Elements
    const accountsTableBody = document.getElementById('accountsTableBody');
    const accountManageModal = document.getElementById('accountManageModal');
    const closeAccountManageModal = document.getElementById('closeAccountManageModal');
    const newAccountBtn = document.getElementById('newAccountBtn');
    const accountManageForm = document.getElementById('accountManageForm');
    const accountModalTitle = document.getElementById('accountModalTitle');

    // Form inputs
    const accManageName = document.getElementById('accManageName');
    const accManageType = document.getElementById('accManageType');
    const accManageBalance = document.getElementById('accManageBalance');

    let currentEditAccountId = null;
    let accountsData = [];

    // Load Accounts
    const loadAccounts = async () => {
        try {
            const res = await fetch('/api/accounts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error fetching accounts');
            accountsData = await res.json();
            renderAccounts();
        } catch (error) {
            console.error(error);
            accountsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--danger);">Error al cargar cuentas.</td></tr>`;
        }
    };

    const renderAccounts = () => {
        if (accountsData.length === 0) {
            accountsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No hay cuentas registradas.</td></tr>`;
            return;
        }

        const typeMap = {
            'cash': 'Efectivo',
            'bank': 'Ahorros',
            'credit': 'Tarjeta de Crédito'
        };

        const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

        accountsTableBody.innerHTML = accountsData.map(acc => `
            <tr>
                <td><strong>${acc.name}</strong></td>
                <td style="color: var(--text-muted)">${typeMap[acc.type] || 'Otro'}</td>
                <td style="font-weight: 500; color: ${acc.balance >= 0 ? 'var(--success)' : 'var(--danger)'}">
                    ${formatter.format(acc.balance)}
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <button class="edit-acc-btn" data-id="${acc.id}" style="background: var(--surface-border); color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; margin-right: 0.5rem; cursor: pointer; transition: 0.2s;" title="Modificar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="del-acc-btn" data-id="${acc.id}" style="background: var(--danger); color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer; transition: 0.2s;" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Attach listeners
        document.querySelectorAll('.edit-acc-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                openEditModal(id);
            });
        });

        document.querySelectorAll('.del-acc-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                await deleteAccount(id);
            });
        });
    };

    // Modal logic
    newAccountBtn.addEventListener('click', () => {
        currentEditAccountId = null;
        accountModalTitle.textContent = 'Registrar Nueva Cuenta';
        accountManageForm.reset();
        accountManageModal.classList.add('active');
    });

    closeAccountManageModal.addEventListener('click', () => {
        accountManageModal.classList.remove('active');
    });

    const openEditModal = (id) => {
        const acc = accountsData.find(a => a.id === id);
        if (!acc) return;
        currentEditAccountId = id;
        accountModalTitle.textContent = 'Modificar Cuenta';

        accManageName.value = acc.name;
        accManageType.value = acc.type;
        accManageBalance.value = acc.balance;

        accountManageModal.classList.add('active');
    };

    // Save logic
    accountManageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: accManageName.value,
            type: accManageType.value,
            balance: parseFloat(accManageBalance.value)
        };

        const method = currentEditAccountId ? 'PUT' : 'POST';
        const url = currentEditAccountId ? `/api/accounts/${currentEditAccountId}` : '/api/accounts';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                try {
                    const data = await res.json();
                    alert(data.error || 'Ocurrió un error al guardar.');
                } catch {
                    alert(`Error HTTP: ${res.status}`);
                }
                return;
            }

            accountManageModal.classList.remove('active');
            loadAccounts();
        } catch (error) {
            console.error('Save error:', error);
            alert('Error de conexión.');
        }
    });

    // Delete logic
    const deleteAccount = async (id) => {
        const acc = accountsData.find(a => a.id === id);
        if (!confirm(`¿Estás seguro de eliminar la cuenta "${acc.name}"?`)) return;

        try {
            const res = await fetch(`/api/accounts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                try {
                    const data = await res.json();
                    alert(data.error || 'Error al eliminar la cuenta.');
                } catch {
                    alert(`Error HTTP: ${res.status}`);
                }
                return;
            }

            loadAccounts();
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error al conectar con el servidor.');
        }
    };

    // Initial load
    loadAccounts();
};
