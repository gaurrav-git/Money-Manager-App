// storage.js — Handles all localStorage read/write operations

import { Transaction } from "./transaction.js";

const KEY = "moneymate_transactions";

export class StorageManager {
  // Load all transactions from localStorage
  static load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed.map(obj => Transaction.fromJSON(obj));
    } catch (err) {
      console.error("Failed to load transactions:", err);
      return [];
    }
  }

  // Save the full list back to localStorage
  static save(transactions) {
    try {
      const data = transactions.map(t => t.toJSON());
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Failed to save transactions:", err);
    }
  }

  // Clear everything — useful for testing
  static clear() {
    localStorage.removeItem(KEY);
  }
}
