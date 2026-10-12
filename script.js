 
"use strict";

const TANK_CAPACITY = 5000;
const STORAGE_KEY = "rainwise_records";

let records = [];
let rainChart = null;
let usageChart = null;

let simulated = {
  rainfall: 24,
  collected: 2400,
  used: 650,
  tank: 3750
};

function $(id) {
  return document.getElementById(id);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value) {
  if (!value) return "-";

  const parts = value.split("-");
  if (parts.length !== 3) return value;

  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    records = Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error("Error loading records:", error);
    records = [];
  }
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error("Error saving records:", error);
    alert("Could not save records in this browser.");
    return false;
  }
}

// Tank estimate
function getTankLevel() {
  if (records.length === 0) return simulated.tank;

  const collected = records.reduce(
    (sum, record) => sum + Number(record.collected || 0), 0
  );

  const used = records.reduce(
    (sum, record) => sum + Number(record.used || 0), 0
  );

  return Math.max(
    0,
    Math.min(TANK_CAPACITY, 3750 + collected - used)
  );
}

// Dashboard cards
function updateDashboard() {
  const tank = getTankLevel();
  const percent = Math.round(tank / TANK_CAPACITY * 100);
  const today = getLocalDate();

  const todayRecords = records.filter(record => record.date === today);

  const rainfall = records.length
    ? todayRecords.reduce((sum, record) => sum + Number(record.rainfall || 0), 0)
    : simulated.rainfall;

  const collected = records.length
    ? records.reduce((sum, record) => sum + Number(record.collected || 0), 0)
    : simulated.collected;

  const used = records.length
    ? records.reduce((sum, record) => sum + Number(record.used || 0), 0)
    : simulated.used;

  if ($("rainfall")) $("rainfall").textContent = formatNumber(rainfall);
  if ($("collected")) $("collected").textContent = formatNumber(collected);
  if ($("used")) $("used").textContent = formatNumber(used);

  if ($("tank-percent")) $("tank-percent").textContent = percent;
  if ($("tank-litres")) $("tank-litres").textContent = formatNumber(tank);
  if ($("tank-reading")) $("tank-reading").textContent = formatNumber(tank);

  if ($("tank-progress")) $("tank-progress").style.width = percent + "%";
  if ($("tank-water")) $("tank-water").style.height = percent + "%";

  if ($("free-space")) {
    $("free-space").textContent = formatNumber(TANK_CAPACITY - tank) + " L free";
  }

  if ($("tank-condition")) {
    $("tank-condition").textContent =
      percent >= 75 ? "Good storage level" :
      percent >= 35 ? "Moderate storage level" :
      percent > 0 ? "Low water level" : "Tank is empty";
  }

  updateAlerts(rainfall, percent);
  updateCharts();
}

function updateAlerts(rainfall, percent) {
  const panel = $("alerts");
  if (!panel) return;

  const items = panel.querySelectorAll(".alert-item");

  if (items[0]) {
    const title = items[0].querySelector("strong");
    const message = items[0].querySelector("p");

    if (title) {
      title.textContent = rainfall > 0
        ? "Rainfall recorded (simulated)"
        : "No rainfall recorded";
    }

    if (message) {
      message.textContent = `${rainfall} mm of simulated rainfall.`;
    }
  }

  if (items[1]) {
    const title = items[1].querySelector("strong");
    const message = items[1].querySelector("p");

    if (title) {
      title.textContent =
        percent >= 75 ? "Tank level high" :
        percent >= 35 ? "Tank level normal" :
        "Tank level low";
    }

    if (message) {
      message.textContent =
        `Estimated storage is ${percent}% of tank capacity.`;
    }
  }

  const count = panel.querySelector(".alert-count");
  if (count) count.textContent = percent < 35 ? "1" : "0";
}

// Chart data for the last seven days
function getLastSevenDays() {
  const labels = [];
  const rainfall = [];
  const collected = [];
  const used = [];

  const sampleRain = [12, 0, 18, 24, 7, 15, 24];
  const sampleCollected = [250, 0, 450, 700, 150, 350, 500];
  const sampleUsed = [100, 120, 90, 180, 140, 110, 100];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const key = getLocalDate(date);

    labels.push(
      date.toLocaleDateString("en-IN", { weekday: "short" })
    );

    const dayRecords = records.filter(record => record.date === key);

    if (dayRecords.length) {
      rainfall.push(
        dayRecords.reduce((sum, r) => sum + Number(r.rainfall || 0), 0)
      );
      collected.push(
        dayRecords.reduce((sum, r) => sum + Number(r.collected || 0), 0)
      );
      used.push(
        dayRecords.reduce((sum, r) => sum + Number(r.used || 0), 0)
      );
    } else if (records.length === 0) {
      const index = 6 - i;
      rainfall.push(sampleRain[index]);
      collected.push(sampleCollected[index]);
      used.push(sampleUsed[index]);
    } else {
      rainfall.push(0);
      collected.push(0);
      used.push(0);
    }
  }

  return { labels, rainfall, collected, used };
}

function initializeCharts() {
  if (typeof Chart === "undefined") {
    console.error("Chart.js failed to load. Check your internet connection.");
    return;
  }

  if ($("rainChart")) {
    rainChart = new Chart($("rainChart"), {
      type: "bar",
      data: {
        labels: [],
        datasets: [{
          label: "Rainfall (mm)",
          data: [],
          backgroundColor: "#41965b",
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => `${context.parsed.y} mm`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 30,
            title: { display: true, text: "Rainfall (mm)" }
          }
        }
      }
    });
  }

  if ($("usageChart")) {
    usageChart = new Chart($("usageChart"), {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Collected (L)",
            data: [],
            backgroundColor: "#41965b",
            borderRadius: 4
          },
          {
            label: "Used (L)",
            data: [],
            backgroundColor: "#e5b65d",
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Water (litres)" }
          }
        }
      }
    });
  }
}

function updateCharts() {
  const data = getLastSevenDays();

  if (rainChart) {
    rainChart.data.labels = data.labels;
    rainChart.data.datasets[0].data = data.rainfall;
    rainChart.update();
  }

  if (usageChart) {
    usageChart.data.labels = data.labels;
    usageChart.data.datasets[0].data = data.collected;
    usageChart.data.datasets[1].data = data.used;
    usageChart.update();
  }
}

// Display the saved records table
function renderRecords() {
  const body = $("recordsTableBody");
  if (!body) return;

  body.innerHTML = "";

  if (records.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 6;
    cell.textContent = "No records saved yet. Add your first water record above.";
    cell.style.textAlign = "center";
    cell.style.padding = "22px";

    row.appendChild(cell);
    body.appendChild(row);
    return;
  }

  records
    .map((record, index) => ({ record, index }))
    .sort((a, b) => (b.record.date || "").localeCompare(a.record.date || ""))
    .forEach(({ record, index }) => {
      const row = document.createElement("tr");

      const values = [
        displayDate(record.date),
        `${formatNumber(record.rainfall)} mm`,
        `${formatNumber(record.collected)} L`,
        `${formatNumber(record.used)} L`,
        record.notes || "-"
      ];

      values.forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      const actionCell = document.createElement("td");
      const button = document.createElement("button");

      button.type = "button";
      button.className = "outline-btn";
      button.style.width = "auto";
      button.style.marginTop = "0";
      button.textContent = "Delete";

      button.addEventListener("click", () => {
        if (!confirm("Delete this record?")) return;

        records.splice(index, 1);
        saveRecords();
        renderRecords();
        updateDashboard();
      });

      actionCell.appendChild(button);
      row.appendChild(actionCell);
      body.appendChild(row);
    });
}

// Calculator
function initializeCalculator() {
  const form = $("calculatorForm");
  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();

    const area = Number($("roofArea").value);
    const rainfall = Number($("rainfallAmount").value);
    const efficiency = Number($("runoffCoefficient").value);
    const result = $("calculationResult");

    if (
      $("roofArea").value === "" ||
      $("rainfallAmount").value === "" ||
      !Number.isFinite(area) ||
      !Number.isFinite(rainfall) ||
      area <= 0 ||
      rainfall < 0
    ) {
      result.textContent =
        "Enter a roof area greater than zero and valid non-negative rainfall.";
      return;
    }

    const litres = area * rainfall * efficiency;

    result.replaceChildren();

    const label = document.createElement("div");
    label.textContent = "Estimated harvestable water";

    const amount = document.createElement("strong");
    amount.textContent = `${formatNumber(litres)} litres`;

    const detail = document.createElement("div");
    detail.textContent =
      `${area} m² × ${rainfall} mm × ${Math.round(efficiency * 100)}% efficiency`;

    result.append(label, amount, detail);
  });

  form.addEventListener("reset", () => {
    setTimeout(() => {
      if ($("calculationResult")) {
        $("calculationResult").textContent =
          "Enter your roof area and rainfall to calculate estimated water collection.";
      }
    }, 0);
  });
}

// Water record form
function initializeRecordForm() {
  const form = $("recordForm");
  if (!form) return;

  if ($("recordDate")) {
    $("recordDate").value = getLocalDate();
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const date = $("recordDate").value;
    const rainfallText = $("recordRainfall").value;
    const collectedText = $("recordCollected").value;
    const usedText = $("recordUsed").value;

    const rainfall = Number(rainfallText);
    const collected = Number(collectedText);
    const used = Number(usedText);
    const notes = $("recordNotes").value.trim();

    if (
      !date ||
      rainfallText === "" ||
      collectedText === "" ||
      usedText === "" ||
      ![rainfall, collected, used].every(
        value => Number.isFinite(value) && value >= 0
      )
    ) {
      $("recordMessage").textContent =
        "Please enter a date and valid non-negative numbers.";
      return;
    }

    records.push({ date, rainfall, collected, used, notes });

    if (!saveRecords()) {
      records.pop();
      return;
    }

    renderRecords();
    updateDashboard();

    $("recordMessage").textContent = "Water record saved successfully!";
    $("recordMessage").style.color = "#287b45";

    form.reset();
    $("recordDate").value = getLocalDate();
  });

  $("clearForm").addEventListener("click", () => {
    form.reset();
    $("recordDate").value = getLocalDate();
    $("recordMessage").textContent = "";
  });

  $("clearAllRecords").addEventListener("click", () => {
    if (records.length === 0) {
      alert("There are no saved records to clear.");
      return;
    }

    if (!confirm("Delete all saved water records?")) return;

    records = [];

    if (!saveRecords()) return;

    renderRecords();
    updateDashboard();
    $("recordMessage").textContent = "All records have been cleared.";
  });
}

// Refresh simulated readings
function refreshSampleData() {
  simulated.rainfall = Math.floor(Math.random() * 31);
  simulated.collected = Math.floor(Math.random() * 501);
  simulated.used = Math.floor(Math.random() * 201);

  if (records.length === 0) {
    simulated.tank = Math.max(
      0,
      Math.min(
        TANK_CAPACITY,
        simulated.tank + simulated.collected - simulated.used
      )
    );
  }

  updateDashboard();
}

function initializeNavigation() {
  document.querySelectorAll(".nav").forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav").forEach(item => {
        item.classList.remove("active");
      });

      link.classList.add("active");
    });
  });
}

function initialize() {
  loadRecords();
  initializeCharts();
  initializeCalculator();
  initializeRecordForm();
  renderRecords();
  updateDashboard();
  initializeNavigation();

  const refreshButton = $("refresh-btn");

  if (refreshButton) {
    refreshButton.addEventListener("click", refreshSampleData);
  }

  console.log("RainWise website loaded successfully.");
}

document.addEventListener("DOMContentLoaded", initialize);
