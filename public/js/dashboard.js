document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        window.location.href = '/index.html';
        return;
    }

    const user = JSON.parse(userStr);
    document.getElementById('userProfileName').textContent = `Hola, ${user.name.split(' ')[0]}`;

    // Elements
    const totalBalanceEl = document.getElementById('totalBalance');
    const monthlyIncomeEl = document.getElementById('monthlyIncome');
    const monthlyExpenseEl = document.getElementById('monthlyExpense');
    const recentTxListEl = document.getElementById('recentTransactionsList');
    const logoutBtn = document.getElementById('logoutBtn');

    let cashflowChart;
    let currentIncome = 0;
    let currentExpense = 0;
    let currentViewType = 'doughnut';

    // Chart controls listeners
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');

            const viewType = target.getAttribute('data-view');
            currentViewType = viewType;
            renderChart(currentIncome, currentExpense);
        });
    });

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    // Filter elements
    const filterMonthEl = document.getElementById('filterMonth');
    const filterYearEl = document.getElementById('filterYear');

    // Init Date Filters
    const initFilters = () => {
        const now = new Date();
        const year = now.getFullYear();
        for (let i = year - 5; i <= year + 5; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            option.style.color = "black";
            if (i === year) option.selected = true;
            filterYearEl.appendChild(option);
        }
        filterMonthEl.value = now.getMonth().toString();

        filterMonthEl.addEventListener('change', loadDashboardData);
        filterYearEl.addEventListener('change', loadDashboardData);
    };

    const loadDashboardData = async () => {
        try {
            const month = filterMonthEl.value;
            const year = filterYearEl.value;

            const res = await fetch(`/api/dashboard?month=${month}&year=${year}&_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                // Token expired/invalid
                logout();
                return;
            }

            const data = await res.json();

            // Render basic metrics
            totalBalanceEl.textContent = formatMoney(data.totalBalance);
            monthlyIncomeEl.textContent = '+' + formatMoney(data.monthlyIncome);
            monthlyExpenseEl.textContent = '-' + formatMoney(data.monthlyExpense);

            // Save for toggling views
            currentIncome = data.monthlyIncome;
            currentExpense = data.monthlyExpense;

            // Render Chart
            renderChart(currentIncome, currentExpense);

            // Render Recent Transactions
            renderRecentTransactions(data.recentTransactions);

        } catch (error) {
            console.error('Error fetching dashboard', error);
        }
    };

    const renderRecentTransactions = (txs) => {
        if (!txs || txs.length === 0) {
            recentTxListEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 2rem;">No hay transacciones recientes.</p>';
            return;
        }

        recentTxListEl.innerHTML = txs.map(tx => {
            const isIncome = tx.type === 'income';
            const sign = isIncome ? '+' : '-';
            const colorClass = isIncome ? 'text-success' : 'text-danger';

            const dateStr = new Date(tx.date).toLocaleDateString();

            return `
                <div class="transaction-item" data-id="${tx.id}">
                    <div class="tx-info">
                        <h4>${tx.note || 'Transacción'}</h4>
                        <p>${dateStr} | ${tx.type === 'transfer' ? 'Transferencia' : (isIncome ? 'Ingreso' : 'Gasto')}</p>
                    </div>
                    <div class="tx-amount ${tx.type === 'transfer' ? '' : colorClass}">
                        ${tx.type === 'transfer' ? '' : sign}${formatMoney(tx.amount)}
                    </div>
                </div>
            `;
        }).join('');
    };

    const renderChart = (income, expense) => {
        const chartView = document.getElementById('chartView');
        const tableView = document.getElementById('tableView');
        const tableBody = document.getElementById('cashflowTableBody');

        if (currentViewType === 'table') {
            chartView.classList.add('hidden');
            tableView.classList.remove('hidden');

            tableBody.innerHTML = `
                <tr>
                    <td>Ingresos</td>
                    <td class="text-success">+${formatMoney(income)}</td>
                </tr>
                <tr>
                    <td>Gastos</td>
                    <td class="text-danger">-${formatMoney(expense)}</td>
                </tr>
            `;
            return;
        }

        // It's a chart view
        chartView.classList.remove('hidden');
        tableView.classList.add('hidden');

        const ctx = document.getElementById('cashflowChart').getContext('2d');

        if (cashflowChart) {
            cashflowChart.destroy();
        }

        Chart.register(ChartDataLabels);
        Chart.defaults.color = '#94A3B8';
        Chart.defaults.font.family = 'Inter';

        const chartConfig = {
            type: currentViewType === 'bar' ? 'bar' : 'doughnut',
            data: {
                labels: ['Ingresos', 'Gastos'],
                datasets: [{
                    label: 'Flujo del Mes',
                    data: [income, expense],
                    backgroundColor: [
                        '#10B981', // success
                        '#EF4444'  // danger
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: 30
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        display: currentViewType === 'doughnut'
                    },
                    datalabels: {
                        color: '#94A3B8',
                        align: 'end',
                        anchor: 'end',
                        offset: 10,
                        font: {
                            weight: 'bold',
                            size: 13
                        },
                        formatter: (value, context) => {
                            if (value === 0) return '';
                            // Only show percentages for doughnut
                            if (currentViewType === 'doughnut') {
                                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) + '%' : '0%';
                                return percentage + '\n' + formatMoney(value);
                            }
                            return formatMoney(value);
                        },
                        textAlign: 'center'
                    }
                }
            }
        };

        if (currentViewType === 'doughnut') {
            chartConfig.options.cutout = '70%';
        } else if (currentViewType === 'bar') {
            chartConfig.options.scales = {
                y: {
                    beginAtZero: true
                }
            };
            chartConfig.options.plugins.datalabels.align = 'top';
            chartConfig.options.plugins.datalabels.anchor = 'end';
        }

        cashflowChart = new Chart(ctx, chartConfig);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    };

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Initialize
    initFilters();
    loadDashboardData();
});
