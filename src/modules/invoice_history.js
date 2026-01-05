import { supabase } from '../supabase.js';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { MoreVertical, Eye, Trash2, X, Download } from 'lucide';

export async function initInvoiceHistory(container, user) {
    const isSuperAdmin = user.role === 'super_admin';

    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-3xl font-bold text-slate-800">Invoice History</h2>
                    ${user.store_name ? `<p class="text-sm font-semibold text-blue-600 mt-1">Store: ${user.store_name}</p>` : ''}
                </div>
                
                <div class="flex items-center gap-4">
                     ${isSuperAdmin ? `
                        <select id="store-filter" class="input-field py-2 text-sm w-48 bg-white shadow-sm">
                            <option value="">All Stores</option>
                        </select>
                    ` : ''}

                    <button id="download-all-report" class="btn-secondary text-sm">
                        <i data-lucide="download" class="w-4 h-4 mr-2"></i> Export CSV
                    </button>
                </div>
            </div>

            <div class="card overflow-hidden relative">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-slate-600">
                        <thead class="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                                <th class="p-4">Invoice No</th>
                                <th class="p-4">Date</th>
                                <th class="p-4">Customer</th>
                                ${isSuperAdmin ? '<th class="p-4">Store</th>' : ''}
                                <th class="p-4 text-center">Status</th>
                                <th class="p-4 text-right">Amount</th>
                                <th class="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="invoice-list-body" class="divide-y divide-slate-100">
                            <tr><td colspan="6" class="p-8 text-center">Loading invoices...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- GLOBAL FLOATING POPUP MENU -->
        <div id="global-action-menu" class="hidden fixed z-[60] bg-white rounded-lg shadow-xl border border-slate-100 w-44 py-1 animate-in fade-in zoom-in-95 duration-100">
            <button id="popup-view" class="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                <i data-lucide="eye" class="w-4 h-4"></i> View Detail
            </button>
            <button id="popup-download" class="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                <i data-lucide="download" class="w-4 h-4"></i> Download PDF
            </button>
            <div class="border-t border-slate-100 my-1"></div>
            <button id="popup-delete" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                <i data-lucide="trash-2" class="w-4 h-4"></i> Delete
            </button>
        </div>

        <!-- Modal for Invoice Details -->
        <div id="detail-modal" class="fixed inset-0 z-50 hidden bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 class="text-lg font-bold text-slate-800">Invoice Details</h3>
                    <button id="close-modal-btn" class="text-slate-400 hover:text-red-500 transition-colors">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div id="modal-content" class="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <!-- Content injected via JS -->
                </div>
                <div class="px-6 py-4 bg-slate-50 text-right flex justify-end gap-3">
                     <button id="modal-download-btn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors text-sm flex items-center gap-2">
                        <i data-lucide="download" class="w-4 h-4"></i> Download PDF
                    </button>
                    <button id="close-modal-action" class="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded font-medium transition-colors text-sm">Close</button>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    const tbody = container.querySelector('#invoice-list-body');
    const storeFilter = container.querySelector('#store-filter');
    let bills = [];
    let currentStoreFilter = null;

    // Fetch Stores for Filter (Super Admin)
    if (isSuperAdmin && storeFilter) {
        (async () => {
            const { data } = await supabase.from('stores').select('id, name');
            if (data) {
                data.forEach(store => {
                    const opt = document.createElement('option');
                    opt.value = store.id;
                    opt.textContent = store.name;
                    storeFilter.appendChild(opt);
                });
            }
        })();

        storeFilter.addEventListener('change', (e) => {
            currentStoreFilter = e.target.value;
            fetchBills();
        });
    }

    // --- Fetch ---
    async function fetchBills() {
        let query = supabase.from('bills').select('*, stores(name)').order('created_at', { ascending: false });

        if (isSuperAdmin && currentStoreFilter) {
            query = query.eq('store_id', currentStoreFilter);
        }

        const { data, error } = await query;

        if (error) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-red-500">Error loading data</td></tr>`;
            return;
        }

        bills = data;
        renderTable();
    }

    // --- Render Table ---
    function renderTable() {
        if (bills.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">No invoices found</td></tr>`;
            return;
        }

        tbody.innerHTML = bills.map(b => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-4 font-mono text-xs text-slate-500 font-bold">${b.invoice_number || '#' + b.id.slice(0, 8).toUpperCase()}</td>
                <td class="p-4">${new Date(b.created_at).toLocaleDateString()}</td>
                <td class="p-4 font-medium text-slate-800">
                    ${b.customer_name || 'Walk-in'}
                    <div class="text-xs text-slate-400">${b.customer_phone || ''}</div>
                </td>
                <td class="p-4 text-center">
                    <span class="px-2 py-1 rounded text-xs font-bold 
                        ${b.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${b.payment_status || 'Paid'}
                    </span>
                </td>
                <td class="p-4 text-right font-bold text-slate-800">₹${b.total_amount.toFixed(2)}</td>
                <td class="p-4 text-right">
                    <button class="menu-trigger p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors" data-id="${b.id}">
                        <i data-lucide="more-vertical" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        if (window.lucide) window.lucide.createIcons();
        attachRowListeners();
    }

    function attachRowListeners() {
        tbody.querySelectorAll('.menu-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const bill = bills.find(b => b.id === id);
                if (bill) showPopup(btn, bill);
            });
        });
    }

    // Popup Actions
    popupViewBtn.addEventListener('click', () => {
        if (currentActiveBill) openInvoiceModal(currentActiveBill);
    });

    // FIX: Popup Download Handler
    popupDownloadBtn.addEventListener('click', async () => {
        if (currentActiveBill) {
            // 1. Save bill to local variable to prevent it from being null after hiding popup
            const billToDownload = currentActiveBill;

            // 2. Hide Popup
            hidePopup();

            // 3. Generate PDF with error handling
            try {
                await generateAndDownloadPDF(billToDownload);
            } catch (error) {
                console.error("PDF Download Failed:", error);
                alert("Failed to generate PDF. Please check console for details.");
            }
        }
    });

    popupDeleteBtn.addEventListener('click', async () => {
        if (currentActiveBill) {
            hidePopup();
            const adminPass = prompt("Enter Developer Password to DELETE:");
            if (adminPass !== "admin123") {
                alert("Incorrect Password! Access Denied.");
                return;
            }

            if (confirm('Are you sure you want to DELETE this invoice from the database? This action is irreversible.')) {
                const { error } = await supabase.from('bills').delete().eq('id', currentActiveBill.id);
                if (error) alert('Error deleting: ' + error.message);
                else fetchBills();
            }
        }
    });

    // CSV Report
    container.querySelector('#download-all-report').addEventListener('click', () => {
        if (bills.length === 0) return;

        let csv = "Invoice No,Date,Customer,Phone,Status,GST Applied,Total Amount\n";

        csv += bills.map(b => {
            const invNum = b.invoice_number || `#${b.id.slice(0, 8).toUpperCase()}`;
            return `${invNum},${new Date(b.created_at).toLocaleDateString()},${b.customer_name || 'Walk-in'},${b.customer_phone || ''},${b.payment_status || 'Paid'},${b.gst_applied},${b.total_amount}`;
        }).join("\n");

        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    fetchBills();
}

/* ==============================================================================
   UPDATED PDF GENERATION (JRPL DESIGN)
   ============================================================================== */
async function generateAndDownloadPDF(billData) {
    if (!billData) throw new Error("Bill data missing");

    /* =========================
       FETCH ITEMS
    ========================== */
    const { data: items, error } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', billData.id);

    if (error) throw error;

    const doc = new jsPDF('p', 'mm', 'a4');

    /* =========================
       COMPANY INFO
    ========================== */
    const companyName = "JRPL | Jaysan Resource (P) Ltd.";
    const companySer = "Computer Hardware and Peripherals Sales & Services";
    const companyAddress = "Shop No. 3, Sameera Plaza, Naza Market, Lucknow (UP) - 226021";
    const companyPhone = "Ph: +91 96346 23233 | Email: jaysanresource555@gmail.com";
    const gstinText = "GSTIN: 09ABCDE1234F1Z5";

    /* =========================
       DB MAPPING
    ========================== */
    const invoiceNum =
        billData.invoice_number || `#${billData.id.slice(0, 8).toUpperCase()}`;

    const custName = billData.customer_name || "Walk-in";
    const custPhone = billData.customer_phone || "";
    const total = billData.total_amount;
    const isGst = billData.gst_applied;

    /* =========================
       TAX CALCULATION
    ========================== */
    let subtotal = total;
    let cgst = 0, sgst = 0, igst = 0;
    const gstType = billData.gst_type || "CGST"; // optional column

    if (isGst) {
        subtotal = total / 1.18;
        if (gstType === "IGST") {
            igst = subtotal * 0.18;
        } else {
            cgst = subtotal * 0.09;
            sgst = subtotal * 0.09;
        }
    }

    /* =========================
       HEADER
    ========================== */
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 55, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(22);
    doc.text(companyName, 14, 20);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);

    const leftX = 14;
    const maxWidth = 120;

    doc.text(companySer, leftX, 28, { maxWidth });
    doc.text(companyAddress, leftX, 34, { maxWidth });
    doc.text(companyPhone, leftX, 40, { maxWidth });
    doc.text(gstinText, leftX, 46, { maxWidth });

    doc.setFontSize(26);
    doc.setFont(undefined, 'bold');
    doc.text("INVOICE", 195, 25, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(invoiceNum, 195, 33, { align: 'right' });

    /* =========================
       BILL TO
    ========================== */
    const yPos = 65;

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text("BILL TO", 14, yPos);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(custName, 14, yPos + 6);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    if (custPhone) doc.text(custPhone, 14, yPos + 11);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text("DATE", 150, yPos);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.text(new Date(billData.created_at).toLocaleDateString(), 150, yPos + 6);

    /* =========================
       ITEMS TABLE
    ========================== */
    const tableData = items.map((item, i) => {
        let desc = item.product_name;
        if (item.serial_number) desc += `\nSN: ${item.serial_number}`;
        if (item.problem) desc += `\nService: ${item.problem}`;
        if (item.part_name) desc += `\nPart Changed: ${item.part_name}`;

        return [
            i + 1,
            desc,
            item.quantity,
            `INR ${item.price_at_sale.toFixed(2)}`,
            `INR ${(item.price_at_sale * item.quantity).toFixed(2)}`
        ];
    });

    doc.autoTable({
        head: [['#', 'Item Description', 'Qty', 'Price', 'Total']],
        body: tableData,
        startY: yPos + 25,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: {
            fillColor: [248, 250, 252],
            textColor: [100, 116, 139],
            fontStyle: 'bold',
            lineColor: [226, 232, 240],
            lineWidth: 0.1
        },
        bodyStyles: { textColor: [51, 65, 85] },
        columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' }
        }
    });

    /* =========================
       TOTALS
    ========================== */
    let finY = doc.lastAutoTable.finalY + 10;
    const xLabel = 140;
    const xRight = 195;

    if (finY > 250) {
        doc.addPage();
        finY = 20;
    }

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Subtotal", xLabel, finY);
    doc.setTextColor(15, 23, 42);
    doc.text(`INR ${subtotal.toFixed(2)}`, xRight, finY, { align: 'right' });

    if (isGst) {
        if (gstType === "IGST") {
            finY += 6;
            doc.setTextColor(100, 116, 139);
            doc.text("IGST (18%)", xLabel, finY);
            doc.setTextColor(15, 23, 42);
            doc.text(`INR ${igst.toFixed(2)}`, xRight, finY, { align: 'right' });
        } else {
            finY += 6;
            doc.setTextColor(100, 116, 139);
            doc.text("CGST (9%)", xLabel, finY);
            doc.setTextColor(15, 23, 42);
            doc.text(`INR ${cgst.toFixed(2)}`, xRight, finY, { align: 'right' });

            finY += 6;
            doc.setTextColor(100, 116, 139);
            doc.text("SGST (9%)", xLabel, finY);
            doc.setTextColor(15, 23, 42);
            doc.text(`INR ${sgst.toFixed(2)}`, xRight, finY, { align: 'right' });
        }
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(130, finY + 6, 195, finY + 6);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("Total", xLabel, finY + 16);
    doc.text(`INR ${total.toFixed(2)}`, xRight, finY + 16, { align: 'right' });

    /* =========================
       FOOTER
    ========================== */
    const pageHeight = doc.internal.pageSize.height;

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Thank you for your business!", 14, pageHeight - 20);
    doc.text(
        "www.jaysanresource.com | jaysanresource555@gmail.com | +91 96346 23233",
        14,
        pageHeight - 15
    );

    doc.setFillColor(59, 130, 246);
    doc.rect(0, pageHeight - 2, 210, 2, 'F');

    doc.save(`Invoice_${invoiceNum.replace(/\//g, '-')}.pdf`);
}
