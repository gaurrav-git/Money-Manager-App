// transaction.js — Transaction model class

export class Transaction {
  constructor({ id, amount, date, category, subCategory, description }) {
    this.id          = id || crypto.randomUUID();
    this.amount      = parseFloat(amount);
    this.date        = date;
    this.category    = category;       // "Income" | "Expense"
    this.subCategory = subCategory;
    this.description = description ? description.trim() : "";
    this.createdAt   = new Date().toISOString();
  }

  // Return a plain object — safe to JSON.stringify
  toJSON() {
    return {
      id:          this.id,
      amount:      this.amount,
      date:        this.date,
      category:    this.category,
      subCategory: this.subCategory,
      description: this.description,
      createdAt:   this.createdAt,
    };
  }

  // Rebuild a Transaction from a stored plain object
  static fromJSON(obj) {
    const tx = new Transaction(obj);
    tx.createdAt = obj.createdAt;
    return tx;
  }

  // Pretty-print the date for display
  get formattedDate() {
    const [y, m, d] = this.date.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun",
                    "Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
  }
}
