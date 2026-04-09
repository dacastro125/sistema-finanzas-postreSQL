window.initPage_loans = function() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/index.html'; return; }

    // Elements
    const loanForm = document.getElementById('loanForm');
    const tableWrapper = document.getElementById('tableWrapper');
    const loanSummary = document.getElementById('loanSummary');
    const tbody = document.getElementById('amortizationTableBody');

    // Summary Elements
    const elSumTotal = document.getElementById('sumTotalPagar');
    const elSumIntereses = document.getElementById('sumIntereses');
    const elSumCuota = document.getElementById('sumCuotaFija');

    // New element for Save Credit logic
    const saveCreditForm = document.getElementById('saveCreditForm');
    let currentCreditPlan = null;

    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

    loanForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get Values
        const amount = parseFloat(document.getElementById('loanAmount').value);
        let rate = parseFloat(document.getElementById('loanRate').value);
        const rateType = document.getElementById('loanRateType').value;
        let term = parseInt(document.getElementById('loanTerm').value);
        const termType = document.getElementById('loanTermType').value;

        if (amount <= 0 || rate <= 0 || term <= 0) {
            alert('Por favor, ingresa valores mayores a cero.');
            return;
        }

        // Convert to monthly
        // If rate is annual, convert to monthly decimal
        let rateMonthly = (rateType === 'anual') ? (rate / 100 / 12) : (rate / 100);

        // If term is in years, convert to months
        let termMonths = (termType === 'anios') ? (term * 12) : term;

        // Sistema Francés Formula: Cuota = Capital * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
        const cuota = amount * (rateMonthly * Math.pow(1 + rateMonthly, termMonths)) / (Math.pow(1 + rateMonthly, termMonths) - 1);

        currentCreditPlan = {
            amount: amount,
            interestRate: rate,
            rateType: rateType,
            term: term,
            termType: termType,
            installments: [] // Will be populated by the table generator
        };

        generateAmortizationTable(amount, rateMonthly, termMonths, cuota);

        // Show Results
        tableWrapper.style.display = 'block';
        loanSummary.style.display = 'flex';
        saveCreditForm.style.display = 'flex';

        // Smooth scroll to results
        setTimeout(() => {
            loanSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    });

    function generateAmortizationTable(amount, rateMonthly, termMonths, cuotaMensual) {
        let saldo = amount;
        let totalIntereses = 0;
        let htmlRows = '';

        for (let i = 1; i <= termMonths; i++) {
            const interes = saldo * rateMonthly;
            totalIntereses += interes;

            // La amortizacion es lo que le queda a la cuota despues de pagar intereses
            let amortizacion = cuotaMensual - interes;

            // Ajuste final para evitar decimles residuales por redondeo
            if (i === termMonths) {
                amortizacion = saldo;
                cuotaMensual = interes + amortizacion;
            }

            const saldoInicial = saldo;
            saldo -= amortizacion;

            // Evitar saldo negativo flotante
            if (saldo < 0.01) saldo = 0;

            if (currentCreditPlan) {
                currentCreditPlan.installments.push({
                    installmentNumber: i,
                    initialBalance: saldoInicial,
                    interest: interes,
                    amortization: amortizacion,
                    totalInstallment: cuotaMensual,
                    finalBalance: saldo,
                    status: 'pending'
                });
            }

            htmlRows += `
                <tr>
                    <td style="color: var(--text-muted)">${i}</td>
                    <td>${formatter.format(saldoInicial)}</td>
                    <td style="color: var(--danger)">${formatter.format(interes)}</td>
                    <td style="color: var(--success)">${formatter.format(amortizacion)}</td>
                    <td style="font-weight: 500">${formatter.format(cuotaMensual)}</td>
                    <td>${formatter.format(saldo)}</td>
                </tr>
            `;
        }

        tbody.innerHTML = htmlRows;

        // Update Summary Boxes
        const totalPagar = amount + totalIntereses;
        elSumTotal.textContent = formatter.format(totalPagar);
        elSumIntereses.textContent = formatter.format(totalIntereses);
        elSumCuota.textContent = formatter.format(cuotaMensual); // Usually constant
    }

    // Save Logic
    saveCreditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const creditName = document.getElementById('creditName').value;

        if (!currentCreditPlan || currentCreditPlan.installments.length === 0) {
            alert("No hay un plan de cuotas generado para guardar.");
            return;
        }

        const payload = {
            name: creditName,
            ...currentCreditPlan
        };

        try {
            const response = await fetch('/api/credits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Navigate to credits via SPA
                if (window.spaNavigate) {
                    window.spaNavigate('credits');
                } else {
                    window.location.href = 'credits.html';
                }
            } else {
                const data = await response.json();
                alert(data.error || 'Error al guardar el crédito');
            }
        } catch (error) {
            console.error('Network Error:', error);
            alert('Error de conectividad al guardar el crédito.');
        }
    });
};
