// charts.js — Chart rendering using Chart.js

export class ChartManager {
  constructor() {
    this.pieChart = null;
    this.barChart = null;
  }

  // Color palette for categories
  _colors() {
    return [
      "#f5c842", "#3dd68c", "#7b68ee", "#ff6b6b",
      "#36cfc9", "#ff9f43", "#c678dd", "#61afef",
      "#e06c75", "#56b6c2"
    ];
  }

  renderPie(transactions) {
    const canvas  = document.getElementById("expensePieChart");
    const noMsg   = document.getElementById("noPieData");
    const expenses = transactions.filter(t => t.category === "Expense");

    if (expenses.length === 0) {
      canvas.style.display = "none";
      noMsg.style.display  = "block";
      if (this.pieChart) { this.pieChart.destroy(); this.pieChart = null; }
      return;
    }

    canvas.style.display = "block";
    noMsg.style.display  = "none";

    // Group by sub-category
    const grouped = {};
    expenses.forEach(t => {
      grouped[t.subCategory] = (grouped[t.subCategory] || 0) + t.amount;
    });
    const labels = Object.keys(grouped);
    const data   = Object.values(grouped);
    const colors = this._colors().slice(0, labels.length);

    if (this.pieChart) this.pieChart.destroy();

    this.pieChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: "#18181d",
          borderWidth: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#7a7a96",
              font: { family: "Sora", size: 11 },
              boxWidth: 12,
              padding: 14
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ₹${ctx.parsed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
            }
          }
        }
      }
    });
  }

  renderBar(transactions) {
    const canvas = document.getElementById("summaryBarChart");
    const noMsg  = document.getElementById("noBarData");

    if (transactions.length === 0) {
      canvas.style.display = "none";
      noMsg.style.display  = "block";
      if (this.barChart) { this.barChart.destroy(); this.barChart = null; }
      return;
    }

    canvas.style.display = "block";
    noMsg.style.display  = "none";

    const totalIncome  = transactions.filter(t => t.category === "Income")
                                     .reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.category === "Expense")
                                     .reduce((s, t) => s + t.amount, 0);

    if (this.barChart) this.barChart.destroy();

    this.barChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: ["Income", "Expense"],
        datasets: [{
          data: [totalIncome, totalExpense],
          backgroundColor: ["rgba(61,214,140,0.7)", "rgba(255,107,107,0.7)"],
          borderColor:     ["#3dd68c", "#ff6b6b"],
          borderWidth: 2,
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ₹${ctx.parsed.y.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: "#2e2e38" },
            ticks: { color: "#7a7a96", font: { family: "Sora" } }
          },
          y: {
            grid: { color: "#2e2e38" },
            ticks: {
              color: "#7a7a96",
              font: { family: "JetBrains Mono", size: 11 },
              callback: v => "₹" + v.toLocaleString("en-IN")
            }
          }
        }
      }
    });
  }
}
