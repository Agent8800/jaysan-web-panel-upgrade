import { supabase } from '../supabase.js';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Trash2, Printer, Download, PlusCircle } from 'lucide';


export async function initBilling(container, user) {
    const isStoreAdmin = !!user.store_id;

    container.innerHTML = `
        <div class="h-full flex gap-6">
            <!-- Product Selection (Left) -->
            <div class="w-1/2 flex flex-col gap-6">
                <div>
                     <h2 class="text-3xl font-bold text-slate-800 mb-2">New Bill</h2>
                     <p class="text-slate-500">Select products, repairs, or add custom items</p>
                     ${!isStoreAdmin ? '<p class="text-red-500 text-sm font-bold mt-2">View Only: Super Admin cannot create bills directly.</p>' : ''}
                </div>
                
                <div class="card p-6 flex-1 flex flex-col overflow-y-auto relative ${!isStoreAdmin ? 'opacity-50 pointer-events-none' : ''}">
                    <!-- Overlay for non-store admins -->
                    ${!isStoreAdmin ? '<div class="absolute inset-0 z-10 cursor-not-allowed"></div>' : ''}

                    <div class="mb-4">
                        <label class="block text-sm font-medium text-slate-700 mb-1">Customer Details</label>
                        <div class="grid grid-cols-2 gap-4">
                            <input type="text" id="bill-cust-name" class="input-field" placeholder="Name">
                            <input type="text" id="bill-cust-phone" class="input-field" placeholder="Phone">
                        </div>
                    </div>

                    <!-- Search Section -->
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div class="relative group">
                            <label class="block text-sm font-medium text-slate-700 mb-1">Add Stock Product</label>
                            <input type="text" id="product-search" class="input-field" placeholder="Search product..." autocomplete="off">
                            <div id="product-dropdown" class="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto hidden divide-y divide-slate-100"></div>
                        </div>
                        <div class="relative group">
                            <label class="block text-sm font-medium text-slate-700 mb-1">Add Repair Ticket</label>
                            <input type="text" id="repair-search" class="input-field" placeholder="Search Device / Serial..." autocomplete="off">
                            <div id="repair-dropdown" class="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto hidden divide-y divide-slate-100"></div>
                        </div>
                    </div>

                    <div id="selected-product-preview" class="hidden bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                         <div class="flex justify-between items-center mb-2">
                            <span class="font-bold text-blue-900" id="preview-name"></span>
                            <span class="text-blue-700 text-sm">Stock: <span id="preview-stock"></span></span>
                         </div>
                         <div class="flex items-end gap-3">
                            <div class="flex-1">
                                <label class="text-xs text-blue-600 block mb-1">Quantity</label>
                                <input type="number" id="add-qty" class="input-field h-9 text-sm" value="1" min="1">
                            </div>
                            <div class="flex-1">
                                <label class="text-xs text-blue-600 block mb-1">Price</label>
                                <input type="number" id="add-price" class="input-field h-9 text-sm">
                            </div>
                            <button id="add-to-cart-btn" class="btn-primary h-9 px-4 text-sm">Add</button>
                         </div>
                    </div>

                    <!-- Manual Item Entry Divider -->
                    <div class="relative flex py-2 items-center">
                        <div class="flex-grow border-t border-slate-200"></div>
                        <span class="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-medium">Or Add Manual Item / Service</span>
                        <div class="flex-grow border-t border-slate-200"></div>
                    </div>

                    <!-- Manual Item Form -->
                    <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                        <label class="block text-sm font-medium text-slate-700 mb-2">Item / Service Details</label>
                        <div class="grid grid-cols-12 gap-2 mb-2">
                             <div class="col-span-12 mb-2">
                                <input type="text" id="manual-name" class="input-field h-9 text-sm" placeholder="Item Name / Device Model">
                             </div>
                             <div class="col-span-6">
                                <input type="text" id="manual-serial" class="input-field h-9 text-sm" placeholder="Serial No. (Optional)">
                             </div>
                             <div class="col-span-3">
                                <input type="number" id="manual-price" class="input-field h-9 text-sm" placeholder="Price">
                             </div>
                             <div class="col-span-3">
                                <input type="number" id="manual-qty" class="input-field h-9 text-sm" value="1" placeholder="Qty">
                             </div>
                             <div class="col-span-6">
                                <input type="text" id="manual-problem" class="input-field h-9 text-sm" placeholder="Service / Problem (Optional)">
                             </div>
                             <div class="col-span-6">
                                <input type="text" id="manual-part" class="input-field h-9 text-sm" placeholder="Part Replaced (Optional)">
                             </div>
                        </div>
                         <button id="add-manual-btn" class="btn-secondary w-full h-9 text-sm border-dashed">
                            <i data-lucide="plus-circle" class="w-4 h-4 mr-2"></i> Add Item
                        </button>
                    </div>

                </div>
            </div>

            <!-- Invoice Preview (Right) -->
            <div class="w-1/2 flex flex-col">
                <div class="card h-full flex flex-col p-6 bg-white shadow-xl relative"> 
                    <div class="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                        <div>
                            <h3 class="font-bold text-xl text-slate-800">Invoice Draft</h3>
                            <p class="text-xs text-slate-400" id="invoice-date">${new Date().toLocaleDateString()}</p>
                            ${user.store_name ? `<p class="text-xs text-blue-600 font-bold mt-1">${user.store_name}</p>` : ''}
                        </div>
                         <div class="flex items-center gap-3">
                             <select id="payment-status" class="input-field h-10 text-xs py-0 pl-3 pr-8 w-36 bg-slate-50 border-slate-200 focus:ring-0">
                                <option value="Paid">Paid</option>
                                <option value="Pending">Pending</option>
                            </select>
                             
                             <!-- GST Controls -->
                             <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                <label class="inline-flex items-center cursor-pointer mr-1">
                                    <input type="checkbox" id="gst-toggle" class="sr-only peer">
                                    <span class="px-2 py-1 text-xs font-bold text-slate-400 peer-checked:text-slate-800 transition-colors">GST</span>
                                </label>
                                <select id="gst-type-select" class="h-6 text-[10px] py-0 pl-2 pr-6 border-none bg-transparent text-slate-600 font-medium focus:ring-0 hidden" disabled>
                                    <option value="CGST_SGST">CGST/SGST</option>
                                    <option value="IGST">IGST (18%)</option>
                                </select>
                             </div>
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto custom-scrollbar">
                        <table class="w-full text-left">
                            <thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                                <tr>
                                    <th class="py-2 px-2 rounded-l-lg w-1/3">Item</th>
                                    <th class="py-2 w-1/4">Details</th>
                                    <th class="py-2 text-center">Qty</th>
                                    <th class="py-2 text-right">Price</th>
                                    <th class="py-2 text-right px-2 rounded-r-lg">Total</th>
                                    <th class="py-2"></th>
                                </tr>
                            </thead>
                            <tbody id="cart-items" class="text-slate-700 text-sm divide-y divide-slate-50">
                                <!-- Cart Items -->
                            </tbody>
                        </table>
                         <div id="empty-cart-msg" class="text-center py-10 text-slate-400 text-sm italic">
                            No items added yet.
                        </div>
                    </div>

                    <div class="bg-slate-50 rounded-xl p-4 mt-4 space-y-2 border border-slate-100">
                        <div class="flex justify-between text-slate-600">
                            <span>Subtotal</span>
                            <span id="subtotal-display">₹0.00</span>
                        </div>
                        <div class="flex justify-between text-slate-600 hidden gst-line" id="cgst-row">
                            <span>CGST (9%)</span>
                            <span id="cgst-display">₹0.00</span>
                        </div>
                        <div class="flex justify-between text-slate-600 hidden gst-line" id="sgst-row">
                            <span>SGST (9%)</span>
                            <span id="sgst-display">₹0.00</span>
                        </div>
                        <div class="flex justify-between text-slate-600 hidden gst-line" id="igst-row">
                            <span>IGST (18%)</span>
                            <span id="igst-display">₹0.00</span>
                        </div>
                        <div class="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-200">
                            <span>Total</span>
                            <span id="total-display">₹0.00</span>
                        </div>
                    </div>

                    <button id="generate-bill-btn" class="btn-primary w-full mt-4 py-3 text-lg shadow-lg shadow-primary/20" disabled>
                        Generate Invoice
                    </button>
                    <div id="post-bill-actions" class="hidden grid-cols-2 gap-4 mt-4">
                        <button id="download-pdf" class="btn-secondary flex items-center justify-center gap-2 text-sm justify-center">
                            <i data-lucide="download" class="w-4 h-4"></i> Download PDF
                        </button>
                         <button id="print-bill" class="btn-secondary flex items-center justify-center gap-2 text-sm justify-center">
                            <i data-lucide="printer" class="w-4 h-4"></i> Print
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // State
    let cart = []; // { id, name, price, qty, isManual, serial, problem, part_name }
    let products = [];
    let repairs = [];
    let selectedProduct = null;
    let isGst = false;
    let gstType = 'CGST_SGST'; // 'CGST_SGST' or 'IGST'

    // Elements
    const searchInput = container.querySelector('#product-search');
    const repairSearchInput = container.querySelector('#repair-search');
    const dropdown = container.querySelector('#product-dropdown');
    const repairDropdown = container.querySelector('#repair-dropdown');
    const previewBox = container.querySelector('#selected-product-preview');
    const cartTbody = container.querySelector('#cart-items');
    const emptyMsg = container.querySelector('#empty-cart-msg');

    // GST Elements
    const gstToggle = container.querySelector('#gst-toggle');
    const gstSelect = container.querySelector('#gst-type-select');

    const generateBtn = container.querySelector('#generate-bill-btn');
    const postActions = container.querySelector('#post-bill-actions');

    const subtotalEl = container.querySelector('#subtotal-display');
    const cgstEl = container.querySelector('#cgst-display');
    const sgstEl = container.querySelector('#sgst-display');
    const igstEl = container.querySelector('#igst-display');
    const totalEl = container.querySelector('#total-display');

    const cgstRow = container.querySelector('#cgst-row');
    const sgstRow = container.querySelector('#sgst-row');
    const igstRow = container.querySelector('#igst-row');

    // Load Products
    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('*').gt('quantity', 0);
        if (data) products = data;
    };
    fetchProducts();

    // Load Repairs
    const fetchRepairs = async () => {
        const { data } = await supabase.from('repairs').select('*').order('created_at', { ascending: false }).limit(50);
        if (data) repairs = data;
    };
    fetchRepairs();

    // Product Search
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        if (!val) {
            dropdown.classList.add('hidden');
            return;
        }
        const matches = products.filter(p => p.name.toLowerCase().includes(val));
        dropdown.innerHTML = matches.map(p => `
            <div class="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0" data-id="${p.id}">
                <div class="font-medium text-slate-800">${p.name}</div>
                <div class="text-xs text-slate-500">₹${p.price} | Stock: ${p.quantity}</div>
            </div>
        `).join('');
        if (matches.length > 0) dropdown.classList.remove('hidden');
        else dropdown.classList.add('hidden');
    });

    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('[data-id]');
        if (item) {
            const id = item.dataset.id;
            selectedProduct = products.find(p => p.id === id);
            container.querySelector('#preview-name').textContent = selectedProduct.name;
            container.querySelector('#preview-stock').textContent = selectedProduct.quantity;
            container.querySelector('#add-price').value = selectedProduct.price;
            container.querySelector('#add-qty').value = 1;
            container.querySelector('#add-qty').max = selectedProduct.quantity;
            previewBox.classList.remove('hidden');
            dropdown.classList.add('hidden');
            searchInput.value = '';
        }
    });

    // Repair Search
    repairSearchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        if (!val) {
            repairDropdown.classList.add('hidden');
            return;
        }
        const matches = repairs.filter(r =>
            (r.device_details && r.device_details.toLowerCase().includes(val)) ||
            (r.serial_number && r.serial_number.toLowerCase().includes(val)) ||
            (r.customer_name && r.customer_name.toLowerCase().includes(val))
        );

        repairDropdown.innerHTML = matches.map(r => `
             <div class="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0" data-id="${r.id}">
                <div class="font-medium text-slate-800">${r.device_details} <span class="text-xs text-slate-400">(${r.status})</span></div>
                <div class="text-xs text-slate-500">SN: ${r.serial_number || 'N/A'} | Cost: ₹${r.estimated_cost}</div>
            </div>
        `).join('');

        if (matches.length > 0) repairDropdown.classList.remove('hidden');
        else repairDropdown.classList.add('hidden');
    });

    repairDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('[data-id]');
        if (item) {
            const id = item.dataset.id;
            const r = repairs.find(repair => repair.id === id);

            addItemToCart({
                id: null,
                name: r.device_details,
                price: parseFloat(r.estimated_cost) || 0,
                qty: 1,
                max_qty: 1,
                isManual: true,
                serial: r.serial_number || '',
                problem: r.problem_found || r.issue_description || '',
                part_name: r.part_replaced_name || ''
            });

            repairDropdown.classList.add('hidden');
            repairSearchInput.value = '';
        }
    });

    // Add Stock Item
    container.querySelector('#add-to-cart-btn').addEventListener('click', () => {
        if (!selectedProduct) return;
        const qty = parseInt(container.querySelector('#add-qty').value) || 1;
        const price = parseFloat(container.querySelector('#add-price').value) || 0;

        if (qty > selectedProduct.quantity) {
            alert('Not enough stock!');
            return;
        }

        let fetchedSerial = '';
        if (selectedProduct.serial_number && selectedProduct.serial_number.length > 0) {
            const availableSerials = selectedProduct.serial_number.split(',').filter(s => s.trim());
            if (availableSerials.length >= 1) fetchedSerial = availableSerials.slice(0, qty).join(', ');
        }

        addItemToCart({
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: price,
            qty: qty,
            max_qty: selectedProduct.quantity,
            isManual: false,
            serial: fetchedSerial,
            problem: '',
            part_name: ''
        });

        selectedProduct = null;
        previewBox.classList.add('hidden');
    });

    // Add Manual Item
    container.querySelector('#add-manual-btn').addEventListener('click', () => {
        const name = container.querySelector('#manual-name').value;
        const price = parseFloat(container.querySelector('#manual-price').value) || 0;
        const qty = parseInt(container.querySelector('#manual-qty').value) || 1;
        const serial = container.querySelector('#manual-serial').value;
        const problem = container.querySelector('#manual-problem').value;
        const part = container.querySelector('#manual-part').value;

        if (!name) { alert('Enter item name'); return; }
        if (price < 0) { alert('Enter valid price'); return; }

        addItemToCart({
            id: null,
            name: name,
            price: price,
            qty: qty,
            max_qty: 9999,
            isManual: true,
            serial: serial,
            problem: problem,
            part_name: part
        });

        container.querySelector('#manual-name').value = '';
        container.querySelector('#manual-price').value = '';
        container.querySelector('#manual-qty').value = '1';
        container.querySelector('#manual-serial').value = '';
        container.querySelector('#manual-problem').value = '';
        container.querySelector('#manual-part').value = '';
    });

    function addItemToCart(newItem) {
        cart.push(newItem);
        renderCart();
    }

    // GST Toggle
    gstToggle.addEventListener('change', (e) => {
        isGst = e.target.checked;
        if (isGst) {
            gstSelect.classList.remove('hidden');
            gstSelect.disabled = false;
        } else {
            gstSelect.classList.add('hidden');
            gstSelect.disabled = true;
        }
        renderCart();
    });

    // GST Type Change
    gstSelect.addEventListener('change', (e) => {
        gstType = e.target.value;
        renderCart();
    });

    function renderCart() {
        if (cart.length === 0) {
            cartTbody.innerHTML = '';
            emptyMsg.classList.remove('hidden');
        } else {
            emptyMsg.classList.add('hidden');
            cartTbody.innerHTML = cart.map((item, idx) => {
                let details = '';
                if (item.serial) details += `<span class="block text-xs text-slate-500">SN: ${item.serial}</span>`;
                if (item.part_name) details += `<span class="block text-xs text-slate-500">Part: ${item.part_name}</span>`;
                if (item.problem) details += `<span class="block text-xs text-slate-500">Svc: ${item.problem}</span>`;

                return `
                <tr class="group hover:bg-slate-50 transition-colors">
                    <td class="py-3 px-2 font-medium text-slate-800 align-top">
                        ${item.name} 
                        ${item.isManual ? '<span class="text-[10px] bg-slate-100 text-slate-500 px-1 rounded border border-slate-200 ml-1">MANUAL</span>' : ''}
                    </td>
                    <td class="py-3 pr-2 align-top">
                        ${details}
                    </td>
                    <td class="py-3 text-center text-slate-600 align-top">${item.qty}</td>
                    <td class="py-3 text-right text-slate-600 align-top">₹${item.price.toFixed(2)}</td>
                    <td class="py-3 text-right font-medium px-2 align-top">₹${(item.price * item.qty).toFixed(2)}</td>
                    <td class="py-3 text-right pr-2 opacity-0 group-hover:opacity-100 transition-opacity align-top">
                        <button class="cart-remove-btn text-slate-400 hover:text-red-500 transition-colors" data-idx="${idx}">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </td>
                </tr>
            `}).join('');
        }

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        let total = subtotal;

        // Reset Displays
        cgstRow.classList.add('hidden');
        sgstRow.classList.add('hidden');
        igstRow.classList.add('hidden');

        if (isGst) {
            if (gstType === 'IGST') {
                const igst = subtotal * 0.18;
                total += igst;
                igstRow.classList.remove('hidden');
                igstEl.textContent = `₹${igst.toFixed(2)}`;
            } else {
                const cgst = subtotal * 0.09;
                const sgst = subtotal * 0.09;
                total += cgst + sgst;
                cgstRow.classList.remove('hidden');
                sgstRow.classList.remove('hidden');
                cgstEl.textContent = `₹${cgst.toFixed(2)}`;
                sgstEl.textContent = `₹${sgst.toFixed(2)}`;
            }
        }

        subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
        totalEl.textContent = `₹${total.toFixed(2)}`;

        generateBtn.disabled = cart.length === 0;
        if (window.lucide) window.lucide.createIcons();

        cartTbody.querySelectorAll('.cart-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.idx);
                cart.splice(idx, 1);
                renderCart();
            });
        });
    }

    // Generate Bill
    generateBtn.addEventListener('click', async () => {
        if (!user.store_id) {
            alert("Error: No store associated with this user.");
            return;
        }

        generateBtn.textContent = "Processing...";
        generateBtn.disabled = true;

        const custName = container.querySelector('#bill-cust-name').value || 'Walk-in Customer';
        const custPhone = container.querySelector('#bill-cust-phone').value;
        const paymentStatus = container.querySelector('#payment-status').value;

        // Recalculate Final Total
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        let total = subtotal;
        if (isGst) {
            if (gstType === 'IGST') {
                total += (subtotal * 0.18);
            } else {
                total += (subtotal * 0.09) * 2;
            }
        }

        const { data: billData, error: billError } = await supabase.from('bills').insert([{
            store_id: user.store_id, // CRITICAL
            customer_name: custName,
            customer_phone: custPhone,
            total_amount: total,
            gst_applied: isGst,
            gst_type: isGst ? gstType : null, // Save GST Type
            payment_status: paymentStatus
        }]).select().single();

        if (billError) {
            console.error(billError);
            alert('Error generating bill: ' + billError.message);
            generateBtn.textContent = "Generate Invoice";
            generateBtn.disabled = false;
            return;
        }

        const year = new Date().getFullYear();
        // Just use sequence ID for invoice number for now, simpler
        const invoiceNum = `#${user.store_name?.substring(0, 3).toUpperCase() || 'INV'}/${year}/${1000 + billData.id.charCodeAt(0) + Math.floor(Math.random() * 100)}`;
        // Note: Using UUID for ID means no easy sequence... 
        // For MVP, lets just generate a random/timestamp based invoice number if we don't have a sequence table.
        // Actually, we can use a simpler approach or rely on created_at.

        await supabase.from('bills').update({ invoice_number: invoiceNum }).eq('id', billData.id);

        const itemsPayload = cart.map(item => ({
            bill_id: billData.id,
            store_id: user.store_id, // CRITICAL
            product_id: item.isManual ? null : item.id,
            product_name: item.name,
            quantity: item.qty,
            price_at_sale: item.price,
            serial_number: item.serial || null
        }));

        const { error: itemsError } = await supabase.from('bill_items').insert(itemsPayload);
        if (itemsError) console.error('Error adding items:', itemsError);

        for (const item of cart) {
            if (!item.isManual) {
                const newQty = item.max_qty - item.qty;
                await supabase.from('products').update({ quantity: newQty }).eq('id', item.id);
            }
        }

        fetchProducts();
        generateBtn.textContent = "Invoice Generated";
        alert(`Invoice Generated Successfully!\nNumber: ${invoiceNum}`);

        generateBtn.classList.add('hidden');
        postActions.classList.remove('hidden');
        postActions.classList.add('grid');

        // PDF Generation (using invoiceNum)
        const generatePDF = () => {
            const doc = new jsPDF('p', 'mm', 'a4');

            /* =========================
               COMPANY INFO
            ========================== */
            const companyName = user.store_name ? `JRPL | ${user.store_name}` : "JRPL | Jaysan Resource (P) Ltd.";
            const companySer = "Computer Hardware and Peripherals Sales & Services";
            const companyAddress = user.store_location || "Shop No. 3, Sameera Plaza, Naza Market, Lucknow (UP) - 226021";
            const companyPhone = "Ph: +91 96346 23233 | Email: jaysanresource555@gmail.com";
            const gstinText = "GSTIN: 29ABCDE1234F1Z5";

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
            doc.text(new Date().toLocaleDateString(), 150, yPos + 6);

            /* =========================
               ITEMS TABLE
            ========================== */
            const tableData = cart.map((item, i) => {
                let desc = item.name;
                if (item.serial) desc += `\nSN: ${item.serial}`;
                if (item.problem) desc += `\nService: ${item.problem}`;
                if (item.part_name) desc += `\nPart Changed: ${item.part_name}`;

                return [
                    i + 1,
                    desc,
                    item.qty,
                    `INR ${item.price.toFixed(2)}`,
                    `INR ${(item.price * item.qty).toFixed(2)}`
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
                if (gstType === 'IGST') {
                    finY += 6;
                    doc.setTextColor(100, 116, 139);
                    doc.text("IGST (18%)", xLabel, finY);
                    doc.setTextColor(15, 23, 42);
                    doc.text(`INR ${(subtotal * 0.18).toFixed(2)}`, xRight, finY, { align: 'right' });
                } else {
                    finY += 6;
                    doc.setTextColor(100, 116, 139);
                    doc.text("CGST (9%)", xLabel, finY);
                    doc.setTextColor(15, 23, 42);
                    doc.text(`INR ${(subtotal * 0.09).toFixed(2)}`, xRight, finY, { align: 'right' });

                    finY += 6;
                    doc.setTextColor(100, 116, 139);
                    doc.text("SGST (9%)", xLabel, finY);
                    doc.setTextColor(15, 23, 42);
                    doc.text(`INR ${(subtotal * 0.09).toFixed(2)}`, xRight, finY, { align: 'right' });
                }
            }

            doc.setDrawColor(226, 232, 240);
            doc.line(130, finY + 6, 195, finY + 6);

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text("Total", xLabel, finY + 16);
            doc.text(`INR ${total.toFixed(2)}`, xRight, finY + 16, { align: 'right' });

            /* =========================
               FOOTER
            ========================== */
            const pageHeight = doc.internal.pageSize.height;

            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text("Thank you for your business!", 14, pageHeight - 20);
            doc.text(
                "www.jaysanresource.com | jaysanresource555@gmail.com | +91 96346 23233",
                14,
                pageHeight - 15
            );

            doc.setFillColor(59, 130, 246);
            doc.rect(0, pageHeight - 2, 210, 2, 'F');

            return doc;
        };

        container.querySelector('#download-pdf').addEventListener('click', () => {
            const doc = generatePDF();
            doc.save(`Invoice_${invoiceNum.replace(/\//g, '-')}.pdf`);
        });

        container.querySelector('#print-bill').addEventListener('click', () => {
            const doc = generatePDF();
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        });
    });
}
