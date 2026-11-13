"use strict";

document.addEventListener("DOMContentLoaded", function () {

    const API_URL = "/predict";

    const form = document.getElementById("predictForm");
    const predictBtn = document.getElementById("predictBtn");

    const idle = document.getElementById("resultIdle");
    const loading = document.getElementById("resultLoading");
    const errorBox = document.getElementById("resultError");
    const output = document.getElementById("resultOutput");

    const errorText = document.getElementById("errorText");

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

    // Number buttons
    document.querySelectorAll(".step-btn").forEach(function (btn) {

        btn.addEventListener("click", function () {

            const input = document.getElementById(btn.dataset.target);
            if (!input) return;

            const direction = Number(btn.dataset.dir);
            const step = Number(input.step) || 1;

            const min = Number(input.min);
            const max = Number(input.max);

            let value = Number(input.value) || 0;

            value += direction * step;
            value = Math.max(min, Math.min(max, value));

            input.value = value;
        });

    });

    // Validation
    function validate() {

        let valid = true;

        const fields = ["age", "fare", "sibsp", "parch"];

        fields.forEach(function (id) {

            const input = document.getElementById(id);
            const error = document.getElementById("err-" + id);

            const value = Number(input.value);

            let message = "";

            if (input.value.trim() === "" || !Number.isFinite(value)) {
                message = "Enter a valid number.";
            }
            else if (value < Number(input.min) || value > Number(input.max)) {
                message = "Value is outside allowed range.";
            }
            else if (
                (id === "sibsp" || id === "parch") &&
                !Number.isInteger(value)
            ) {
                message = "Enter a whole number.";
            }

            error.textContent = message;

            if (message) valid = false;

        });

        return valid;
    }

    // Form submission
    form.addEventListener("submit", async function (event) {

        // MOST IMPORTANT: stop page refresh
        event.preventDefault();
        event.stopPropagation();

        console.log("Prediction form submitted");

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

        console.log("Sending data:", payload);

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

            console.log("API response:", data);

            if (!response.ok) {
                throw new Error(
                    typeof data.detail === "string"
                        ? data.detail
                        : JSON.stringify(data.detail || data)
                );
            }

            if (typeof data.prediction === "undefined") {
                throw new Error("Invalid response from prediction API.");
            }

            renderResult(data, payload);

        }
        catch (error) {

            console.error("Prediction error:", error);

            showError(error.message || "Unable to connect to server.");

        }
        finally {

            predictBtn.disabled = false;
            predictBtn.textContent = "Predict Survival";

        }

    });

    // Display result
    function renderResult(data, payload) {

        const survived = Number(data.prediction) === 1;

        const icon = document.getElementById("resultIcon");
        const title = document.getElementById("resultTitle");

        icon.textContent = survived ? "✓" : "✕";
        icon.className = survived ? "badge-icon" : "badge-icon bad";

        title.textContent = survived ? "SURVIVED" : "NOT SURVIVED";
        title.className = survived ? "ok" : "no";

        document.getElementById("predValue").textContent =
            data.prediction + " (" + data.result + ")";

        const classNames = {
            1: "1st Class",
            2: "2nd Class",
            3: "3rd Class"
        };

        const ports = {
            C: "Cherbourg",
            Q: "Queenstown",
            S: "Southampton"
        };

        const rows = [
            ["Class", classNames[payload.Pclass]],
            ["Gender", payload.Sex],
            ["Age", payload.Age],
            ["Fare", "£" + payload.Fare],
            ["Siblings / Spouses", payload.SibSp],
            ["Parents / Children", payload.Parch],
            ["Embarked", ports[payload.Embarked]]
        ];

        const list = document.getElementById("passengerInfo");

        list.innerHTML = "";

        rows.forEach(function (row) {

            const div = document.createElement("div");
            const dt = document.createElement("dt");
            const dd = document.createElement("dd");

            dt.textContent = row[0];
            dd.textContent = row[1];

            div.appendChild(dt);
            div.appendChild(dd);

            list.appendChild(div);

        });

        show("output");

        document.getElementById("resultCard").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }

    // Retry
    document.getElementById("retryBtn").addEventListener("click", function () {
        show("idle");
    });

    // Reset
    document.getElementById("resetBtn").addEventListener("click", function () {

        form.reset();
        show("idle");

        form.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    });

    console.log("Titanic Prediction JavaScript Loaded Successfully");

});