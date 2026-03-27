// validator.js — All form validation logic in one place

export class Validator {
  constructor() {
    // Fields we'll check
    this.errors = {};
  }

  // Run all validations and return true if everything passes
  validate(fields) {
    this.errors = {};

    const { amount, date, category, subCategory, description } = fields;

    // -- Amount --
    if (amount === "" || amount === null || amount === undefined) {
      this.errors.amount = "Amount is required.";
    } else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      this.errors.amount = "Amount must be a positive number.";
    }

    // -- Date --
    if (!date) {
      this.errors.date = "Date is required.";
    } else {
      const chosen = new Date(date);
      const today  = new Date();
      today.setHours(23, 59, 59, 999);
      if (isNaN(chosen.getTime())) {
        this.errors.date = "Please enter a valid date.";
      } else if (chosen > today) {
        this.errors.date = "Date cannot be in the future.";
      }
    }

    // -- Category --
    if (!category) {
      this.errors.category = "Please select a category.";
    }

    // -- Sub-category --
    if (!subCategory || subCategory === "") {
      this.errors.subCategory = "Please select a sub-category.";
    }

    // -- Description (optional, max 100) --
    if (description && description.length > 100) {
      this.errors.description = "Description cannot exceed 100 characters.";
    }

    return Object.keys(this.errors).length === 0;
  }

  // Attach error messages to DOM elements
  displayErrors() {
    const map = {
      amount:      { input: "amount",      msg: "amountErr"      },
      date:        { input: "txDate",      msg: "dateErr"        },
      category:    { input: "categoryGroup", msg: "categoryErr"  },
      subCategory: { input: "subCategory", msg: "subCategoryErr" },
      description: { input: "description", msg: "descErr"        },
    };

    // Clear previous errors first
    Object.values(map).forEach(({ input, msg }) => {
      const el = document.getElementById(input);
      const em = document.getElementById(msg);
      if (el) el.classList.remove("field-error");
      if (em) em.textContent = "";
    });

    // Show new errors
    Object.entries(this.errors).forEach(([field, message]) => {
      const ref = map[field];
      if (!ref) return;
      const el = document.getElementById(ref.input);
      const em = document.getElementById(ref.msg);
      if (el) el.classList.add("field-error");
      if (em) em.textContent = message;
    });
  }

  // Clear all visual errors from the form
  static clearErrors() {
    const fields  = ["amount", "txDate", "categoryGroup", "subCategory", "description"];
    const errMsgs = ["amountErr", "dateErr", "categoryErr", "subCategoryErr", "descErr"];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("field-error");
    });
    errMsgs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    });
  }
}
