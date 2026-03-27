// app.js — Main entry point
// MoneyManager class ties together storage, UI, validation, and charts.

import { Transaction }   from "./transaction.js";
import { StorageManager } from "./storage.js";
import { Validator }      from "./validator.js";
import { ChartManager }   from "./charts.js";

// Sub-category options for Income and Expense
const SUB_CATEGORIES = {
  Income:  ["Salary", "Allowances", "Bonus", "Petty Cash", "Freelance", "Investment", "Other"],
  Expense: ["Rent", "Food", "Shopping", "Entertainment", "Transport", "Medical", "Education", "Utilities", "Other"],
};

class MoneyManager {
  constructor() {
    this.transactions   = [];
    this.filtered       = [];
    this.validator      = new Validator();
    this.chartManager   = new ChartManager();
    this.pendingDeleteId = null;

    this._loadData();
    this._bindEvents();
    this._setDefaultDate();
    this._render();
  }

  // ─── Data ───────────────────────────────────────────────────

  _loadData() {
    try {
      this.transactions = StorageManager.load();
      this.filtered     = [...this.transactions];
    } catch (err) {
      console.error("Error loading data:", err);
      this.transactions = [];
      this.filtered     = [];
    }
  }

  _saveData() {
    try {
      StorageManager.save(this.transactions);
    } catch (err) {
      console.error("Error saving data:", err);
    }
  }

  // ─── UI Rendering ───────────────────────────────────────────

  _render() {
    this._renderSummary();
    this._renderTable(this.filtered);
    this._renderCharts();
  }

  _renderSummary() {
    const income  = this.transactions
      .filter(t => t.category === "Income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = this.transactions
      .filter(t => t.category === "Expense")
      .reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    const fmt = n => "₹" + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

    document.getElementById("totalIncome").textContent  = fmt(income);
    document.getElementById("totalExpense").textContent = fmt(expense);
    const balEl = document.getElementById("netBalance");
    balEl.textContent = (balance < 0 ? "-" : "") + fmt(balance);
    balEl.style.color = balance < 0 ? "var(--expense)" : "var(--accent)";
  }

  _renderTable(list) {
    const tbody    = document.getElementById("txTableBody");
    const empty    = document.getElementById("emptyState");
    const countEl  = document.getElementById("txCount");

    tbody.innerHTML = "";
    countEl.textContent = `${list.length} record${list.length !== 1 ? "s" : ""}`;

    if (list.length === 0) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    list.forEach(tx => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${tx.formattedDate}</td>
        <td><span class="badge badge-${tx.category.toLowerCase()}">${tx.category}</span></td>
        <td>${tx.subCategory}</td>
        <td style="color:var(--muted); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${tx.description || "—"}
        </td>
        <td class="amount-cell amount-${tx.category.toLowerCase()}">
          ${tx.category === "Income" ? "+" : "-"}₹${tx.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
        <td>
          <button class="action-btn edit-btn"   data-id="${tx.id}">Edit</button>
          <button class="action-btn delete-btn" data-id="${tx.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach row-level button events
    tbody.querySelectorAll(".edit-btn").forEach(btn =>
      btn.addEventListener("click", () => this._openEditModal(btn.dataset.id))
    );
    tbody.querySelectorAll(".delete-btn").forEach(btn =>
      btn.addEventListener("click", () => this._promptDelete(btn.dataset.id))
    );
  }

  _renderCharts() {
    this.chartManager.renderPie(this.transactions);
    this.chartManager.renderBar(this.transactions);
  }

  // ─── Modal Handling ─────────────────────────────────────────

  _openAddModal() {
    this._resetForm();
    document.getElementById("modalTitle").textContent = "Add Transaction";
    document.getElementById("editId").value = "";
    this._setDefaultDate();
    this._showModal();
  }

  _openEditModal(id) {
    try {
      const tx = this.transactions.find(t => t.id === id);
      if (!tx) throw new Error("Transaction not found.");

      this._resetForm();
      document.getElementById("modalTitle").textContent = "Edit Transaction";
      document.getElementById("editId").value    = tx.id;
      document.getElementById("amount").value    = tx.amount;
      document.getElementById("txDate").value    = tx.date;
      document.getElementById("description").value = tx.description;
      document.getElementById("charCount").textContent = `${tx.description.length}/100`;

      // Select the right radio
      document.querySelectorAll("input[name='category']").forEach(r => {
        r.checked = r.value === tx.category;
      });

      // Populate sub-category dropdown then select the right one
      this._populateSubCategories(tx.category);
      document.getElementById("subCategory").value = tx.subCategory;

      this._showModal();
    } catch (err) {
      console.error("Error opening edit modal:", err);
    }
  }

  _showModal() {
    document.getElementById("modalOverlay").classList.add("active");
  }

  _hideModal() {
    document.getElementById("modalOverlay").classList.remove("active");
    this._resetForm();
  }

  _resetForm() {
    document.getElementById("amount").value      = "";
    document.getElementById("txDate").value      = "";
    document.getElementById("description").value = "";
    document.getElementById("charCount").textContent = "0/100";
    document.querySelectorAll("input[name='category']").forEach(r => r.checked = false);
    document.getElementById("subCategory").innerHTML =
      '<option value="">-- Select Category First --</option>';
    Validator.clearErrors();
    this._setDefaultDate();
  }

  _setDefaultDate() {
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("txDate");
    if (dateInput && !dateInput.value) dateInput.value = today;
  }

  // ─── CRUD Operations ────────────────────────────────────────

  _saveTransaction() {
    try {
      const amount      = document.getElementById("amount").value;
      const date        = document.getElementById("txDate").value;
      const description = document.getElementById("description").value.trim();
      const subCategory = document.getElementById("subCategory").value;
      const categoryEl  = document.querySelector("input[name='category']:checked");
      const category    = categoryEl ? categoryEl.value : "";

      const isValid = this.validator.validate({ amount, date, category, subCategory, description });
      if (!isValid) {
        this.validator.displayErrors();
        return;
      }

      const editId = document.getElementById("editId").value;

      if (editId) {
        // Update existing
        const idx = this.transactions.findIndex(t => t.id === editId);
        if (idx === -1) throw new Error("Transaction to edit not found.");
        this.transactions[idx].amount      = parseFloat(amount);
        this.transactions[idx].date        = date;
        this.transactions[idx].category    = category;
        this.transactions[idx].subCategory = subCategory;
        this.transactions[idx].description = description;
      } else {
        // Create new
        const tx = new Transaction({ amount, date, category, subCategory, description });
        this.transactions.push(tx);
      }

      this._saveData();
      this.filtered = [...this.transactions];
      this._applyFiltersAndSort();
      this._render();
      this._hideModal();
    } catch (err) {
      console.error("Error saving transaction:", err);
    }
  }

  _promptDelete(id) {
    this.pendingDeleteId = id;
    document.getElementById("confirmOverlay").classList.add("active");
  }

  _confirmDelete() {
    try {
      if (!this.pendingDeleteId) return;
      this.transactions = this.transactions.filter(t => t.id !== this.pendingDeleteId);
      this._saveData();
      this.filtered = this.filtered.filter(t => t.id !== this.pendingDeleteId);
      this.pendingDeleteId = null;
      document.getElementById("confirmOverlay").classList.remove("active");
      this._applyFiltersAndSort();
      this._render();
    } catch (err) {
      console.error("Error deleting transaction:", err);
    }
  }

  // ─── Filters & Sorting ──────────────────────────────────────

  _applyFiltersAndSort() {
    try {
      const category    = document.getElementById("filterCategory").value;
      const subCategory = document.getElementById("filterSubCategory").value;
      const from        = document.getElementById("filterFrom").value;
      const to          = document.getElementById("filterTo").value;
      const sortOpt     = document.getElementById("sortOption").value;

      let result = [...this.transactions];

      if (category)    result = result.filter(t => t.category    === category);
      if (subCategory) result = result.filter(t => t.subCategory === subCategory);
      if (from)        result = result.filter(t => t.date >= from);
      if (to)          result = result.filter(t => t.date <= to);

      // Sort
      result.sort((a, b) => {
        if (sortOpt === "date-desc")   return b.date.localeCompare(a.date);
        if (sortOpt === "date-asc")    return a.date.localeCompare(b.date);
        if (sortOpt === "amount-desc") return b.amount - a.amount;
        if (sortOpt === "amount-asc")  return a.amount - b.amount;
        return 0;
      });

      this.filtered = result;
      this._renderTable(this.filtered);
    } catch (err) {
      console.error("Error applying filters:", err);
    }
  }

  _clearFilters() {
    document.getElementById("filterCategory").value    = "";
    document.getElementById("filterSubCategory").value = "";
    document.getElementById("filterFrom").value        = "";
    document.getElementById("filterTo").value          = "";
    document.getElementById("sortOption").value        = "date-desc";
    this._updateSubCategoryFilter("");
    this.filtered = [...this.transactions];
    this._renderTable(this.filtered);
  }

  // ─── Sub-category Helpers ───────────────────────────────────

  _populateSubCategories(category) {
    const sel  = document.getElementById("subCategory");
    const opts = SUB_CATEGORIES[category] || [];
    sel.innerHTML = '<option value="">-- Select Sub-Category --</option>';
    opts.forEach(sc => {
      const opt = document.createElement("option");
      opt.value = sc;
      opt.textContent = sc;
      sel.appendChild(opt);
    });
  }

  _updateSubCategoryFilter(category) {
    const sel  = document.getElementById("filterSubCategory");
    sel.innerHTML = '<option value="">All</option>';
    const opts = category ? (SUB_CATEGORIES[category] || []) : [];
    opts.forEach(sc => {
      const opt = document.createElement("option");
      opt.value = sc;
      opt.textContent = sc;
      sel.appendChild(opt);
    });
  }

  // ─── CSV Export ─────────────────────────────────────────────

  _downloadCSV() {
    try {
      const header = ["Date", "Category", "Sub-Category", "Description", "Amount"];
      const rows   = this.transactions.map(t => [
        t.date, t.category, t.subCategory,
        `"${t.description.replace(/"/g, '""')}"`,
        t.amount.toFixed(2)
      ]);
      const csv   = [header, ...rows].map(r => r.join(",")).join("\n");
      const blob  = new Blob([csv], { type: "text/csv" });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement("a");
      a.href      = url;
      a.download  = `moneymate_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting CSV:", err);
    }
  }

  // ─── Event Binding ──────────────────────────────────────────

  _bindEvents() {
    // Header buttons
    document.getElementById("openModalBtn").addEventListener("click", () => this._openAddModal());
    document.getElementById("downloadCsvBtn").addEventListener("click", () => this._downloadCSV());

    // Modal controls
    document.getElementById("closeModalBtn").addEventListener("click", () => this._hideModal());
    document.getElementById("cancelBtn").addEventListener("click", () => this._hideModal());
    document.getElementById("saveBtn").addEventListener("click", () => this._saveTransaction());

    // Close modal on overlay click
    document.getElementById("modalOverlay").addEventListener("click", e => {
      if (e.target === document.getElementById("modalOverlay")) this._hideModal();
    });

    // Category radio → populate sub-categories
    document.querySelectorAll("input[name='category']").forEach(radio => {
      radio.addEventListener("change", () => {
        this._populateSubCategories(radio.value);
      });
    });

    // Description character counter
    document.getElementById("description").addEventListener("input", function () {
      document.getElementById("charCount").textContent = `${this.value.length}/100`;
    });

    // Delete confirmation
    document.getElementById("confirmDeleteBtn").addEventListener("click", () => this._confirmDelete());
    document.getElementById("cancelDeleteBtn").addEventListener("click", () => {
      this.pendingDeleteId = null;
      document.getElementById("confirmOverlay").classList.remove("active");
    });

    // Filters
    document.getElementById("applyFilterBtn").addEventListener("click", () => this._applyFiltersAndSort());
    document.getElementById("clearFilterBtn").addEventListener("click", () => this._clearFilters());
    document.getElementById("sortOption").addEventListener("change", () => this._applyFiltersAndSort());

    // Category filter changes sub-category options
    document.getElementById("filterCategory").addEventListener("change", e => {
      this._updateSubCategoryFilter(e.target.value);
    });

    // Keyboard: Escape closes modals
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        this._hideModal();
        document.getElementById("confirmOverlay").classList.remove("active");
      }
    });
  }
}

// Boot the app
document.addEventListener("DOMContentLoaded", () => {
  new MoneyManager();
});
