"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "/predict";

    const form = document.getElementById("predictForm");
    const predictBtn = document.getElementById("predictBtn");

    const idle = document.getElementById("resultIdle");
    const loading = document.getElementById("resultLoading");
    const errorBox = document.getElementById("resultError");
    const output = document.getElementById("resultOutput");

    const errorText = document.getElementById("errorText");

    if (!form || !predictBtn) {
        console.error("Prediction form or button not found.");
        return;
    }

    function show(state) {
        idle.hidden = state !== "idle";
        loading.hidden = state !== "loading";
        errorBox.hidden = state !== "error";
        output.hidden = state !== "output";
    }

    function showError(message) {
        errorText.textContent = message;
        show("error");
    }

    // Stars animation
    const stars = document.getElementById("stars");

    if (stars) {
        for (let i = 0; i < 70; i++) {
            const star = document.createElement("span");
            star.className = "star";
            star.style.left = Math.random() * 100 + "%";
            star.style.top = Math.random() * 100 + "%";
            star.style.width = "2px";
            star.style.height = "2px";
            stars.appendChild(star);
        }
    }

    // Number steppers: one click = one step
    document.querySelectorAll(".step-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;

            const direction = Number(btn.dataset.dir);
            const step = Number(input.step) || 1;
            const min = Number(input.min);
            const max = Number(input.max);
            const current = Number(input.value) || 0;

            const next = Math.min(
                max,
                Math.max(min, current + direction * step)
            );

            input.value = next;
            input.dispatchEvent(new Event("input", { bubbles: true }));
        });
    });

    // Validation
    function validate() {
        const fields = ["age", "fare", "sibsp", "parch"];
        let valid = true;

        fields.forEach(id => {
            const input = document.getElementById(id);
            const error = document.getElementById("err-" + id);

            const value = Number(input.value);
            let message = "";

            if (input.value.trim() === "" || !Number.isFinite(value)) {
                message = "Please enter a valid number.";
            } else if (value < Number(input.min) || value > Number(input.max)) {
                message = "Value is outside the allowed range.";
            } else if (
                (id === "sibsp" || id === "parch") &&
                !Number.isInteger(value)
            ) {
                message = "Please enter a whole number.";
            }

            input.classList.toggle("invalid", Boolean(message));

            if (error) error.textContent = message;

            if (message) valid = false;
        });

        return valid;
    }

    // Prediction
    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (!validate()) return;

        const payload = {
            Pclass: Number(document.getElementById("pclass").value),
            Sex: document.getElementById("sex").value,
            Age: Number(document.getElementById("age").value),
            SibSp: Number(document.getElementById("sibsp").value),
            Parch: Number(document.getElementById("parch").value),
            Fare: Number(document.getElementById("fare").value),
            Embarked: document.getElementById("embarked").value
        };

        predictBtn.disabled = true;
        predictBtn.textContent = "Predicting...";

        show("loading");

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail
                        ? JSON.stringify(data.detail)
                        : "Server error: " + response.status
                );
            }

            if (typeof data.prediction === "undefined") {
                throw new Error("Invalid prediction response from server.");
            }

            renderResult(data, payload);

        } catch (error) {
            console.error("Prediction error:", error);

            showError(
                error.message || "Could not connect to the prediction server."
            );

        } finally {
            predictBtn.disabled = false;
            predictBtn.textContent = "Predict Survival";
        }
    });

    // Render prediction
    function renderResult(data, payload) {
        const survived = Number(data.prediction) === 1;

        const icon = document.getElementById("resultIcon");
        const title = document.getElementById("resultTitle");

        icon.className = "badge-icon" + (survived ? "" : " bad");

        icon.textContent = survived ? "✓" : "✕";

        title.textContent = survived ? "SURVIVED" : "NOT SURVIVED";
        title.className = survived ? "ok" : "no";

        document.getElementById("predValue").textContent =
            data.prediction + " (" + data.result + ")";

        const classNames = {
            1: "1st class",
            2: "2nd class",
            3: "3rd class"
        };

        const ports = {
            C: "Cherbourg",
            Q: "Queenstown",
            S: "Southampton"
        };

        const rows = [
            ["Class", classNames[payload.Pclass]],
            ["Gender", payload.Sex],
            ["Age", payload.Age + " years"],
            ["Fare", "£" + payload.Fare],
            ["Siblings / spouses", payload.SibSp],
            ["Parents / children", payload.Parch],
            ["Embarked", ports[payload.Embarked]]
        ];

        const list = document.getElementById("passengerInfo");
        list.innerHTML = "";

        rows.forEach(([label, value]) => {
            const div = document.createElement("div");
            const dt = document.createElement("dt");
            const dd = document.createElement("dd");

            dt.textContent = label;
            dd.textContent = value;

            div.append(dt, dd);
            list.appendChild(div);
        });

        show("output");
    }

    // Reset
    const resetBtn = document.getElementById("resetBtn");

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            form.reset();
            show("idle");
            form.scrollIntoView({ behavior: "smooth" });
        });
    }

    // Retry
    const retryBtn = document.getElementById("retryBtn");

    if (retryBtn) {
        retryBtn.addEventListener("click", () => {
            show("idle");
        });
    }

    // Reveal animations
    const reveals = document.querySelectorAll(".reveal");

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("in");
                    observer.unobserve(entry.target);
                }
            });
        });

        reveals.forEach(el => observer.observe(el));
    } else {
        reveals.forEach(el => el.classList.add("in"));
    }
});