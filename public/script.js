"use strict";

document.addEventListener("DOMContentLoaded", function () {
  var API_URL = "/predict";

  var form = document.getElementById("predictForm");
  var predictBtn = document.getElementById("predictBtn");
  var idle = document.getElementById("resultIdle");
  var loading = document.getElementById("resultLoading");
  var errorBox = document.getElementById("resultError");
  var errorText = document.getElementById("errorText");
  var output = document.getElementById("resultOutput");
  var resultCard = document.getElementById("resultCard");

  /* ---------- Stars ---------- */
  var starsBox = document.getElementById("stars");
  if (starsBox) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 70; i++) {
      var s = document.createElement("span");
      s.className = "star";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 100 + "%";
      var size = Math.random() * 2 + 1;
      s.style.width = size + "px";
      s.style.height = size + "px";
      s.style.animationDelay = (Math.random() * 4).toFixed(2) + "s";
      s.style.animationDuration = (3 + Math.random() * 3).toFixed(2) + "s";
      frag.appendChild(s);
    }
    starsBox.appendChild(frag);
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var index = Array.prototype.indexOf.call(reveals, entry.target);
          entry.target.style.transitionDelay = (index % 3) * 0.12 + "s";
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Number steppers ---------- */
  function roundStep(value, step) {
    var decimals = (String(step).split(".")[1] || "").length;
    return Number(value.toFixed(decimals));
  }

  function stepValue(input, direction) {
    var step = parseFloat(input.step) || 1;
    var min = input.min !== "" ? parseFloat(input.min) : -Infinity;
    var max = input.max !== "" ? parseFloat(input.max) : Infinity;
    var current = parseFloat(input.value);
    if (isNaN(current)) current = min === -Infinity ? 0 : min;
    var next = roundStep(current + direction * step, step);
    next = Math.min(max, Math.max(min, next));
    input.value = next;
    input.classList.remove("invalid");
    setError(input.id, "");
  }

  document.querySelectorAll(".step-btn").forEach(function (btn) {
    var input = document.getElementById(btn.dataset.target);
    var dir = parseInt(btn.dataset.dir, 10);
    var timer = null;
    var interval = null;

    function stop() {
      clearTimeout(timer);
      clearInterval(interval);
    }

    btn.addEventListener("click", function () { stepValue(input, dir); });

    // Hold to repeat on press (mouse and touch)
    btn.addEventListener("pointerdown", function () {
      stop();
      timer = setTimeout(function () {
        interval = setInterval(function () { stepValue(input, dir); }, 70);
      }, 450);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (evt) {
      btn.addEventListener(evt, stop);
    });
  });

  // Arrow keys: native on number inputs; Enter submits the form
  document.querySelectorAll('input[type="number"]').forEach(function (input) {
    input.addEventListener("input", function () {
      input.classList.remove("invalid");
      setError(input.id, "");
    });
  });

  /* ---------- Validation ---------- */
  function setError(id, message) {
    var el = document.getElementById("err-" + id);
    if (el) el.textContent = message;
  }

  function validate() {
    var rules = [
      { id: "age", label: "Age", int: false },
      { id: "fare", label: "Fare", int: false },
      { id: "sibsp", label: "Siblings / spouses", int: true },
      { id: "parch", label: "Parents / children", int: true }
    ];
    var ok = true;
    rules.forEach(function (rule) {
      var input = document.getElementById(rule.id);
      var raw = input.value.trim();
      var value = parseFloat(raw);
      var min = parseFloat(input.min);
      var max = parseFloat(input.max);
      var message = "";
      if (raw === "" || isNaN(value)) message = "Enter a number.";
      else if (value < min) message = "Must be at least " + min + ".";
      else if (value > max) message = "Must be " + max + " or less.";
      else if (rule.int && !Number.isInteger(value)) message = "Use a whole number.";
      input.classList.toggle("invalid", message !== "");
      setError(rule.id, message);
      if (message) ok = false;
    });
    return ok;
  }

  /* ---------- Result panel states ---------- */
  function show(which) {
    idle.hidden = which !== "idle";
    loading.hidden = which !== "loading";
    errorBox.hidden = which !== "error";
    output.hidden = which !== "output";
  }

  function showError(message) {
    errorText.textContent = message;
    show("error");
  }

  function scrollToResult() {
    if (window.matchMedia("(max-width: 900px)").matches) {
      resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function friendlyApiError(status, body) {
    if (status === 422 && body && Array.isArray(body.detail)) {
      var first = body.detail[0] || {};
      var field = first.loc ? first.loc[first.loc.length - 1] : "a field";
      return "The server rejected the value for " + field + ". Please check it and try again.";
    }
    if (body && typeof body.detail === "string") {
      return "The server could not make a prediction: " + body.detail;
    }
    return "The server returned an error (HTTP " + status + "). Please try again.";
  }

  var ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ICON_NO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function renderResult(data, payload) {
    var survived = Number(data.prediction) === 1;
    var icon = document.getElementById("resultIcon");
    var title = document.getElementById("resultTitle");

    icon.className = "badge-icon" + (survived ? "" : " bad");
    icon.innerHTML = survived ? ICON_OK : ICON_NO;
    icon.parentNode.style.setProperty("--ring", survived ? "var(--good)" : "var(--bad)");

    title.className = survived ? "ok" : "no";
    title.textContent = survived ? "SURVIVED" : "NOT SURVIVED";

    document.getElementById("predValue").textContent =
      data.prediction + " (" + data.result + ")";

    var classNames = { 1: "1st class", 2: "2nd class", 3: "3rd class" };
    var ports = { C: "Cherbourg", Q: "Queenstown", S: "Southampton" };
    var rows = [
      ["Class", classNames[payload.Pclass]],
      ["Gender", payload.Sex === "male" ? "Male" : "Female"],
      ["Age", payload.Age + " years"],
      ["Fare", "\u00A3" + payload.Fare],
      ["Siblings / spouses", payload.SibSp],
      ["Parents / children", payload.Parch],
      ["Embarked", payload.Embarked + " \u2013 " + ports[payload.Embarked]]
    ];

    var list = document.getElementById("passengerInfo");
    list.innerHTML = "";
    rows.forEach(function (row) {
      var wrap = document.createElement("div");
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      dt.textContent = row[0];
      dd.textContent = row[1];
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      list.appendChild(wrap);
    });

    show("output");
  }

  /* ---------- Submit ---------- */
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validate()) return;

    var payload = {
      Pclass: parseInt(document.getElementById("pclass").value, 10),
      Sex: document.getElementById("sex").value,
      Age: parseFloat(document.getElementById("age").value),
      SibSp: parseInt(document.getElementById("sibsp").value, 10),
      Parch: parseInt(document.getElementById("parch").value, 10),
      Fare: parseFloat(document.getElementById("fare").value),
      Embarked: document.getElementById("embarked").value
    };

    predictBtn.disabled = true;
    predictBtn.textContent = "Predicting\u2026";
    show("loading");
    scrollToResult();

    var started = Date.now();
    var MIN_LOADING_MS = 700; // keeps the loading animation from flashing

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().catch(function () { return null; }).then(function (body) {
          if (!response.ok) {
            throw { kind: "http", message: friendlyApiError(response.status, body) };
          }
          if (!body || typeof body.prediction === "undefined" || typeof body.result === "undefined") {
            throw { kind: "format", message: "The server sent an unexpected response." };
          }
          return body;
        });
      })
      .then(function (data) {
        var wait = Math.max(0, MIN_LOADING_MS - (Date.now() - started));
        setTimeout(function () { renderResult(data, payload); }, wait);
      })
      .catch(function (err) {
        var message = err && err.message
          ? err.message
          : "Could not reach the server. Make sure the FastAPI app is running on port 5500 and try again.";
        showError(message);
      })
      .then(function () {
        predictBtn.disabled = false;
        predictBtn.textContent = "Predict Survival";
      });
  });

  /* ---------- Reset / retry ---------- */
  document.getElementById("resetBtn").addEventListener("click", function () {
    show("idle");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  document.getElementById("retryBtn").addEventListener("click", function () {
    show("idle");
  });
});
