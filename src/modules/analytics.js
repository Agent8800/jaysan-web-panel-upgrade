import { supabase } from '../supabase.js';
import Chart from 'chart.js/auto';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { FileDown } from 'lucide';

export async function initAnalytics(container, user) {
    const isSuperAdmin = user.role === 'super_admin';

    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-3xl font-bold text-slate-800">Dashboard</h2>
                ${isSuperAdmin ? `
                    <div class="flex items-center gap-4">
                        <select id="store-filter" class="input-field py-2 text-sm w-48 bg-white shadow-sm">
                            <option value="">All Stores</option>
                        </select>
                    </div>
                ` : ''}
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Stat Cards -->
                <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg shadow-blue-500/30">
                    <h3 class="text-blue-100 text-sm font-medium mb-1">Today's Sales</h3>
                    <p class="text-3xl font-bold" id="today-sales">₹0</p>
                </div>
                
                <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg shadow-purple-500/30">
                    <h3 class="text-purple-100 text-sm font-medium mb-1">Active Repairs</h3>
                    <p class="text-3xl font-bold" id="active-repairs">0</p>
                </div>

                <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg shadow-indigo-500/30">
                     <h3 class="text-indigo-100 text-sm font-medium mb-1">Total Revenue</h3>
                     <p class="text-2xl font-bold" id="total-revenue">₹0</p>
                </div>

                <div class="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-6 text-white shadow-lg shadow-rose-500/30">
                     <h3 class="text-rose-100 text-sm font-medium mb-1">Expenditure</h3>
                     <p class="text-2xl font-bold" id="total-expenditure">₹0</p>
                </div>

                <div class="bg-slate-800 rounded-xl p-6 text-white shadow-lg shadow-slate-800/30 relative overflow-hidden group">
                     <h3 class="text-slate-300 text-sm font-medium mb-1">Net Profit / Loss</h3>
                     <p class="text-2xl font-bold" id="net-profit">₹0</p>
                     
                     <div class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button id="download-financial-report" class="bg-white/10 hover:bg-white/20 p-2 rounded-lg backdrop-blur-sm transition-colors text-emerald-400" title="Download Full Financial Report">
                            <i data-lucide="file-bar-chart-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>

                <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg shadow-emerald-500/30 relative overflow-hidden group">
                    <h3 class="text-emerald-100 text-sm font-medium mb-1">Monthly Estimate</h3>
                    <p class="text-3xl font-bold" id="month-sales">₹0</p>
                    
                    <div class="absolute bottom-4 right-4 flex items-center gap-2">
                        <input type="month" id="report-month-picker" class="text-xs text-slate-800 rounded bg-white/90 border-0 h-8 px-2 focus:ring-2 focus:ring-emerald-500" value="${new Date().toISOString().slice(0, 7)}">
                        <button id="download-revenue-report" class="bg-white/20 hover:bg-white/30 p-2 rounded-lg backdrop-blur-sm transition-colors" title="Download Revenue Invoice">
                            <i data-lucide="file-down" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Chart Section -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="card p-6">
                    <h3 class="font-bold text-slate-700 mb-4">Sales - Last 7 Days</h3>
                    <div class="h-64">
                         <canvas id="sales-chart"></canvas>
                    </div>
                </div>
                
                 <div class="card p-6">
                    <h3 class="font-bold text-slate-700 mb-4">Repair Status Distribution</h3>
                    <div class="h-64 flex justify-center">
                         <canvas id="repair-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="card p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-slate-700">Recent Transactions</h3>
                    <button class="text-sm text-accent hover:underline">View All</button>
                </div>
                 <table class="w-full text-left text-sm">
                    <thead class="text-slate-400 font-normal border-b border-slate-100">
                        <tr>
                            <th class="pb-2">ID</th>
                            <th class="pb-2">Customer</th>
                            <th class="pb-2">Amount</th>
                            <th class="pb-2 text-right">Date</th>
                        </tr>
                    </thead>
                    <tbody id="recent-txns" class="text-slate-600 divide-y divide-slate-50">
                        <!-- rows -->
                    </tbody>
                 </table>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    let currentStoreFilter = null;
    const storeFilter = container.querySelector('#store-filter');

    // Load Stores for Filter
    if (isSuperAdmin && storeFilter) {
        const { data } = await supabase.from('stores').select('id, name');
        if (data) {
            data.forEach(store => {
                const opt = document.createElement('option');
                opt.value = store.id;
                opt.textContent = store.name;
                storeFilter.appendChild(opt);
            });
        }
        storeFilter.addEventListener('change', (e) => {
            currentStoreFilter = e.target.value;
            fetchAnalytics(); // Refresh all data
        });
    }

    let salesChartInstance = null;
    let repairChartInstance = null;

    async function fetchAnalytics() {
        // --- 1. Today's Sales ---
        const today = new Date().toISOString().split('T')[0];
        let todayQuery = supabase.from('bills').select('total_amount').gte('created_at', `${today}T00:00:00`);
        if (isSuperAdmin && currentStoreFilter) todayQuery = todayQuery.eq('store_id', currentStoreFilter);

        const { data: todayBills } = await todayQuery;
        const todayTotal = todayBills?.reduce((sum, b) => sum + b.total_amount, 0) || 0;
        container.querySelector('#today-sales').textContent = `₹${todayTotal.toLocaleString()}`;

        // --- 2. Active Repairs ---
        let repairQuery = supabase.from('repairs').select('*', { count: 'exact', head: true }).in('status', ['Received', 'In Process', 'Part Not Available']);
        if (isSuperAdmin && currentStoreFilter) repairQuery = repairQuery.eq('store_id', currentStoreFilter);

        const { count: activeRepairs } = await repairQuery;
        container.querySelector('#active-repairs').textContent = activeRepairs || 0;

        // --- 3. Total Revenue ---
        let revQuery = supabase.from('bills').select('total_amount');
        if (isSuperAdmin && currentStoreFilter) revQuery = revQuery.eq('store_id', currentStoreFilter);

        const { data: allBills } = await revQuery;
        const totalRev = allBills?.reduce((sum, b) => sum + b.total_amount, 0) || 0;
        container.querySelector('#total-revenue').textContent = `₹${totalRev.toLocaleString()}`;

        // --- 4. Total Expenditure --- // NOTE: Assuming expenditures has store_id
        let expQuery = supabase.from('expenditures').select('amount');
        if (isSuperAdmin && currentStoreFilter) {
            // Check if column exists or just try? 
            // We assume store_id exists on expenditures as part of migration. 
            // If it doesn't, this might error or handle silently (depending on Supabase strictness, likely error if column missing)
            expQuery = expQuery.eq('store_id', currentStoreFilter);
        }

        const { data: allExp } = await expQuery;
        const totalExp = allExp?.reduce((sum, e) => sum + e.amount, 0) || 0;
        container.querySelector('#total-expenditure').textContent = `₹${totalExp.toLocaleString()}`;

        // --- 5. Net Profit ---
        const netProfit = totalRev - totalExp;
        const profitEl = container.querySelector('#net-profit');
        profitEl.textContent = `₹${netProfit.toLocaleString()}`;
        profitEl.className = `text-2xl font-bold ${netProfit < 0 ? 'text-rose-400' : 'text-emerald-400'}`;

        // --- 6. Monthly Estimate ---
        const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        let monthQuery = supabase.from('bills').select('total_amount, created_at').gte('created_at', firstDay);
        if (isSuperAdmin && currentStoreFilter) monthQuery = monthQuery.eq('store_id', currentStoreFilter);

        const { data: monthBills } = await monthQuery;
        const monthTotal = monthBills?.reduce((sum, b) => sum + b.total_amount, 0) || 0;
        container.querySelector('#month-sales').textContent = `₹${monthTotal.toLocaleString()}`;

        // --- 7. Charts (Sales) ---
        if (salesChartInstance) salesChartInstance.destroy();

        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        // Use same monthBills if within range, or fetch new if needed? 
        // monthBills only has current month. We might need last 7 days which crosses month.
        // Let's fetch specifically for chart.
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let chartBillsQuery = supabase.from('bills').select('total_amount, created_at').gte('created_at', sevenDaysAgo.toISOString());
        if (isSuperAdmin && currentStoreFilter) chartBillsQuery = chartBillsQuery.eq('store_id', currentStoreFilter);
        const { data: chartBills } = await chartBillsQuery;

        const salesData = last7Days.map(date => {
            const daySales = chartBills?.filter(b => b.created_at.startsWith(date)) || [];
            return daySales.reduce((sum, b) => sum + b.total_amount, 0);
        });

        const salesCtx = container.querySelector('#sales-chart').getContext('2d');
        salesChartInstance = new Chart(salesCtx, {
            type: 'bar',
            data: {
                labels: last7Days.map(d => d.slice(5)),
                datasets: [{
                    label: 'Sales (₹)',
                    data: salesData,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
            }
        });

        // --- 8. Charts (Repairs) ---
        if (repairChartInstance) repairChartInstance.destroy();

        let allRepairsQuery = supabase.from('repairs').select('status');
        if (isSuperAdmin && currentStoreFilter) allRepairsQuery = allRepairsQuery.eq('store_id', currentStoreFilter);
        const { data: allRepairs } = await allRepairsQuery;

        const statusCounts = {};
        ['Received', 'In Process', 'Repaired'].forEach(s => statusCounts[s] = 0);
        allRepairs?.forEach(r => {
            if (statusCounts[r.status] !== undefined) statusCounts[r.status]++;
        });

        const repairCtx = container.querySelector('#repair-chart').getContext('2d');
        repairChartInstance = new Chart(repairCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });

        // --- 9. Recent Txns ---
        let recentQuery = supabase.from('bills').select('*').order('created_at', { ascending: false }).limit(5);
        if (isSuperAdmin && currentStoreFilter) recentQuery = recentQuery.eq('store_id', currentStoreFilter);
        const { data: recentBills } = await recentQuery;

        const txnBody = container.querySelector('#recent-txns');
        txnBody.innerHTML = recentBills?.map(b => `
            <tr>
                <td class="py-3 text-slate-400 font-mono text-xs">#${b.id.slice(0, 6)}</td>
                <td class="py-3 font-medium text-slate-700">${b.customer_name || 'Walk-in'}</td>
                <td class="py-3 font-medium text-slate-800">₹${b.total_amount}</td>
                <td class="py-3 text-right text-slate-500 text-xs">${new Date(b.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('') || '';
    }

    // Reports Logic (Revenue & Financial)
    const revBtn = container.querySelector('#download-revenue-report');
    if (revBtn) {
        revBtn.addEventListener('click', async () => {
            const dateInput = container.querySelector('#report-month-picker').value;
            const [year, month] = dateInput.split('-');
            const startDate = new Date(year, month - 1, 1).toISOString();
            const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

            const doc = new jsPDF();
            doc.text(`Monthly Sales Report - ${monthName}`, 14, 20);
            if (currentStoreFilter) {
                const storeName = storeFilter.options[storeFilter.selectedIndex].text;
                doc.setFontSize(10);
                doc.text(`Store: ${storeName}`, 14, 26);
            }

            let query = supabase
                .from('bills')
                .select('*, bill_items(*)')
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: true });

            if (isSuperAdmin && currentStoreFilter) query = query.eq('store_id', currentStoreFilter);

            const { data: reportBills } = await query;

            if (!reportBills || reportBills.length === 0) {
                alert('No data for this month');
                return;
            }

            const tableRows = [];
            let totalSales = 0;

            reportBills.forEach(bill => {
                const date = new Date(bill.created_at).toLocaleDateString();
                const items = bill.bill_items.map(i => `${i.product_name} (${i.quantity})`).join(', ');
                totalSales += bill.total_amount;
                tableRows.push([
                    date,
                    bill.customer_name || 'Walk-in',
                    items,
                    bill.gst_applied ? 'Yes' : 'No',
                    bill.payment_status || 'Paid',
                    bill.total_amount.toFixed(2)
                ]);
            });

            doc.autoTable({
                head: [['Date', 'Customer', 'Items', 'GST', 'Status', 'Amount']],
                body: tableRows,
                startY: 35,
            });

            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(11);
            doc.text(`Total Sales: ${totalSales.toFixed(2)}`, 14, finalY);
            doc.text(`Total Transactions: ${reportBills.length}`, 14, finalY + 6);

            doc.save(`Revenue_Invoice_${monthName.replace(' ', '_')}.pdf`);
        });
    }

    const finBtn = container.querySelector('#download-financial-report');
    if (finBtn) {
        finBtn.addEventListener('click', async () => {
            const dateInput = container.querySelector('#report-month-picker').value;
            const [year, month] = dateInput.split('-');
            const startDate = new Date(year, month - 1, 1).toISOString();
            const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text(`Financial Report - ${monthName}`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26);
            if (currentStoreFilter) {
                const storeName = storeFilter.options[storeFilter.selectedIndex].text;
                doc.text(`Store: ${storeName}`, 14, 32);
            }

            // Fetch Bills
            let billQuery = supabase
                .from('bills')
                .select('*, bill_items(*)')
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: true });
            if (isSuperAdmin && currentStoreFilter) billQuery = billQuery.eq('store_id', currentStoreFilter);
            const { data: reportBills } = await billQuery;

            // Fetch Expenditures
            let expQuery = supabase
                .from('expenditures')
                .select('*')
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: true });
            if (isSuperAdmin && currentStoreFilter) expQuery = expQuery.eq('store_id', currentStoreFilter);
            const { data: reportExp } = await expQuery;

            let totalRevenue = 0;
            let totalExpenditure = 0;

            // Invoice Table
            doc.setFontSize(14);
            doc.text('1. Revenue (Invoices)', 14, 45);

            const billRows = [];
            if (reportBills && reportBills.length > 0) {
                reportBills.forEach(bill => {
                    totalRevenue += bill.total_amount;
                    billRows.push([
                        new Date(bill.created_at).toLocaleDateString(),
                        `#${bill.invoice_number || bill.id.slice(0, 6)}`,
                        bill.customer_name || 'Walk-in',
                        bill.bill_items.map(i => `${i.product_name} (${i.quantity})`).join(', '),
                        bill.payment_status || 'Paid',
                        bill.total_amount.toFixed(2)
                    ]);
                });
            }

            doc.autoTable({
                head: [['Date', 'Inv #', 'Customer', 'Items', 'Status', 'Amount']],
                body: billRows,
                startY: 50,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] }
            });

            // Expenditure Table
            let finalY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(14);
            doc.text('2. Expenditure', 14, finalY);

            const expRows = [];
            if (reportExp && reportExp.length > 0) {
                reportExp.forEach(ex => {
                    totalExpenditure += ex.amount;
                    expRows.push([
                        new Date(ex.created_at).toLocaleDateString(),
                        ex.item_name,
                        ex.category || '-',
                        ex.type,
                        ex.amount.toFixed(2)
                    ]);
                });
            } else {
                expRows.push(['-', 'No expenditures recorded', '-', '-', '0.00']);
            }

            doc.autoTable({
                head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
                body: expRows,
                startY: finalY + 5,
                theme: 'striped',
                headStyles: { fillColor: [244, 63, 94] }
            });

            // Summary
            finalY = doc.lastAutoTable.finalY + 20;
            if (finalY > 250) { doc.addPage(); finalY = 20; }

            const netProfit = totalRevenue - totalExpenditure;

            doc.setDrawColor(200);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(14, finalY, 180, 50, 3, 3, 'FD');

            doc.setFontSize(16);
            doc.setTextColor(30, 41, 59);
            doc.text('Financial Summary', 20, finalY + 12);
            doc.setFontSize(11);
            doc.setTextColor(71, 85, 105);
            doc.text(`Total Revenue:`, 20, finalY + 25);
            doc.text(`Total Expenditure:`, 20, finalY + 32);
            doc.setFontSize(14);
            doc.text(`Net Profit / Loss:`, 20, finalY + 42);
            doc.text(`${totalRevenue.toFixed(2)}`, 150, finalY + 25, { align: 'right' });
            doc.text(`(${totalExpenditure.toFixed(2)})`, 150, finalY + 32, { align: 'right' });
            if (netProfit >= 0) doc.setTextColor(16, 185, 129); else doc.setTextColor(244, 63, 94);
            doc.text(`${netProfit.toFixed(2)}`, 150, finalY + 42, { align: 'right' });

            doc.save(`Financial_Report_${monthName.replace(' ', '_')}.pdf`);
        });
    }

    fetchAnalytics();
}
