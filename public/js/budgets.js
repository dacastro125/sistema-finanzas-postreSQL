window.initPage_budgets = function() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/index.html'; return; }


    const budgetsContainer = document.getElementById('budgetsContainer');
    const budgetModal = document.getElementById('budgetModal');
    const budgetForm = document.getElementById('budgetForm');
    const closeBtn = document.getElementById('closeBudgetModal');

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const loadBudgets = async () => {
        try {
            budgetsContainer.innerHTML = '<p>Cargando presupuestos...</p>';

            const res = await fetch('/api/budgets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                logout(); return;
            }

            const data = await res.json();
            renderBudgets(data);

        } catch (error) {
            console.error('Error fetching budgets', error);
            budgetsContainer.innerHTML = '<p class="text-danger">Error al cargar presupuestos.</p>';
        }
    };

    const renderBudgets = (budgetsData) => {
        if (!budgetsData || budgetsData.length === 0) {
            budgetsContainer.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1;">No tienes categorías de gasto para presupuestar.</p>';
            return;
        }

        budgetsContainer.innerHTML = budgetsData.map((item, index) => {
            const hasBudget = item.limitAmount > 0;
            const progressColor = item.percentage >= 100 ? 'var(--danger)' :
                item.percentage >= 80 ? 'var(--warning)' : 'var(--primary)';

            return `
                <div class="budget-card animate-fade-in" style="animation-delay: ${index * 0.1}s;">
                    <div class="budget-header">
                        <div class="budget-title">
                            <span class="budget-color-indicator" style="background-color: ${item.color || '#94A3B8'};"></span>
                            ${item.categoryName}
                        </div>
                        <div class="budget-actions">
                            <button onclick="openBudgetModal('${item.categoryId}', '${item.categoryName}', ${item.limitAmount})" title="Editar Límite">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                    
                    ${hasBudget ? `
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${item.percentage}%; background-color: ${progressColor};"></div>
                        </div>
                        <div class="progress-stats">
                            <span>Gastado: ${formatMoney(item.spentAmount)}</span>
                            <span>Límite: ${formatMoney(item.limitAmount)}</span>
                        </div>
                        <div style="font-size: 0.8rem; margin-top: 0.5rem; color: ${progressColor}; text-align:right;">
                            ${item.percentage.toFixed(1)}% utilizado
                        </div>
                    ` : `
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">
                            No hay un límite establecido para esta categoría.
                        </p>
                    `}
                </div>
            `;
        }).join('');
    };

    window.openBudgetModal = (categoryId, categoryName, currentLimit) => {
        document.getElementById('budgetCategId').value = categoryId;
        document.getElementById('budgetCategName').value = categoryName;
        document.getElementById('budgetLimitAmount').value = currentLimit || 0;
        budgetModal.classList.add('active');
    };

    closeBtn.addEventListener('click', () => {
        budgetModal.classList.remove('active');
    });

    budgetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryId = document.getElementById('budgetCategId').value;
        const limitAmount = document.getElementById('budgetLimitAmount').value;

        const btn = budgetForm.querySelector('button');
        btn.innerHTML = 'Guardando...';
        btn.disabled = true;

        try {
            await fetch('/api/budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ categoryId, limitAmount })
            });

            budgetModal.classList.remove('active');
            loadBudgets(); // Refresh
        } catch (error) {
            console.error('Save error', error);
        } finally {
            btn.innerHTML = 'Guardar Presupuesto';
            btn.disabled = false;
        }
    });

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    };

    loadBudgets();
};
