window.initPage_credits = function() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/index.html'; return; }

    const creditsList = document.getElementById('creditsList');
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

    // Load Data
    loadCredits();

    async function loadCredits() {
        try {
            const res = await fetch('/api/credits', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const credits = await res.json();
                renderCredits(credits);
            } else {
                console.error("Failed to load credits");
            }
        } catch (e) {
            console.error(e);
        }
    }

    function renderCredits(credits) {
        if (credits.length === 0) {
            creditsList.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 3rem; background: var(--surface); border-radius: 1rem; border: 1px dashed var(--surface-border);">
                    <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No tienes créditos ni préstamos en seguimiento actualmente.</p>
                </div>
            `;
            return;
        }

        let html = '';
        credits.forEach(credit => {
            const totalToPay = credit.installments.reduce((sum, item) => sum + item.totalInstallment, 0);
            const paidSum = credit.installments.filter(i => i.status === 'paid').reduce((sum, item) => sum + item.totalInstallment, 0);
            const pendingSum = totalToPay - paidSum;

            // Stats
            const progressPercent = Math.round((paidSum / totalToPay) * 100) || 0;
            const paidCount = credit.installments.filter(i => i.status === 'paid').length;
            const totalCount = credit.installments.length;

            html += `
                <div class="credit-card" id="credit-${credit.id}">
                    <div class="credit-card-header" onclick="toggleCreditBody('${credit.id}')">
                        <div class="credit-card-title">
                            <i class="fas fa-university" style="color: var(--primary)"></i> 
                            ${credit.name}
                        </div>
                        <div>
                            <span style="font-size:0.85rem; color: var(--text-muted); margin-right: 1rem;">Progreso: ${progressPercent}% (${paidCount}/${totalCount} Cuotas)</span>
                            <i class="fas fa-chevron-down" id="icon-${credit.id}" style="transition: transform 0.3s;"></i>
                        </div>
                    </div>

                    <div class="credit-card-stats">
                        <div class="stat-box">
                            <p>Monto Original</p>
                            <h4>${formatter.format(credit.amount)}</h4>
                        </div>
                        <div class="stat-box">
                            <p>Deuda Restante</p>
                            <h4 style="color: var(--danger)">${formatter.format(pendingSum)}</h4>
                        </div>
                        <div class="stat-box">
                            <p>Total Abonado</p>
                            <h4 style="color: var(--success)">${formatter.format(paidSum)}</h4>
                        </div>
                    </div>

                    <div class="credit-body" id="body-${credit.id}">
                        <table class="installment-table">
                            <thead>
                                <tr>
                                    <th>N° Cuota</th>
                                    <th>Capital Abono</th>
                                    <th>Interés</th>
                                    <th>Total Cuota</th>
                                    <th>Estado</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${credit.installments.map(cuota => {
                const isPaid = cuota.status === 'paid';
                return `
                                    <tr style="${isPaid ? 'opacity: 0.6;' : ''}">
                                        <td>${cuota.installmentNumber}</td>
                                        <td style="color: var(--success)">${formatter.format(cuota.amortization)}</td>
                                        <td style="color: var(--danger)">${formatter.format(cuota.interest)}</td>
                                        <td style="font-weight: bold;">${formatter.format(cuota.totalInstallment)}</td>
                                        <td>
                                            <span class="status-badge ${isPaid ? 'status-paid' : 'status-pending'}">
                                                ${isPaid ? (cuota.amountPaid ? `Pagada (${formatter.format(cuota.amountPaid)})` : 'Pagada') : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td>
                                            <button class="pay-btn" ${isPaid ? 'disabled' : ''} onclick="payInstallment('${credit.id}', ${cuota.installmentNumber}, ${cuota.totalInstallment})">
                                                <i class="fas fa-check-circle"></i> ${isPaid ? 'Saldado' : 'Abonar'}
                                            </button>
                                        </td>
                                    </tr>
                                    `;
            }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        creditsList.innerHTML = html;
    }

    // Assign globally to be accessible from HTML onclick
    window.toggleCreditBody = function (id) {
        const body = document.getElementById(`body-${id}`);
        const icon = document.getElementById(`icon-${id}`);

        if (body.classList.contains('active')) {
            body.classList.remove('active');
            icon.style.transform = 'rotate(0deg)';
        } else {
            body.classList.add('active');
            icon.style.transform = 'rotate(180deg)';
        }
    };

    window.payInstallment = async function (creditId, installmentNumber, cuotaTotal) {
        // Mostrar prompt con el monto sugerido (cuota completa)
        const suggested = cuotaTotal ? cuotaTotal.toFixed(2) : '';
        const input = prompt(
            `Cuota N° ${installmentNumber}\nIngresa el monto que deseas abonar:`,
            suggested
        );
        if (input === null) return; // canceló
        const payAmount = parseFloat(input);
        if (isNaN(payAmount) || payAmount <= 0) {
            alert('Ingresa un monto válido mayor a cero.');
            return;
        }

        try {
            const res = await fetch(`/api/credits/${creditId}/pay`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ installmentNumber, payAmount })
            });

            if (res.ok) {
                loadCredits();
            } else {
                const data = await res.json();
                alert(data.error || 'Error al registrar el pago');
            }
        } catch (error) {
            console.error(error);
            alert('Error al contactar con el servidor');
        }
    };
};

