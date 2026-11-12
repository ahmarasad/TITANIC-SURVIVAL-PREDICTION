from pathlib import Path
from typing import Literal

import joblib
import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field


# --------------------------------
# Project directory
# --------------------------------

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "Svm_model.pkl"


# --------------------------------
# FastAPI application
# --------------------------------

app = FastAPI(
    title="Titanic Survival Prediction",
    description="Machine Learning based Titanic Survival Prediction API",
    version="1.0.0"
)


# --------------------------------
# CORS settings
# --------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# --------------------------------
# Load trained ML model
# --------------------------------

try:
    model = joblib.load(MODEL_PATH)

except Exception as error:
    raise RuntimeError(
        f"Unable to load model: {error}"
    )


# --------------------------------
# Input data validation
# --------------------------------

class PassengerData(BaseModel):

    Pclass: Literal[1, 2, 3]

    Sex: Literal["male", "female"]

    Age: float = Field(
        ge=0,
        le=100
    )

    SibSp: int = Field(
        ge=0
    )

    Parch: int = Field(
        ge=0
    )

    Fare: float = Field(
        ge=0
    )

    Embarked: Literal["C", "Q", "S"]


# --------------------------------
# Home route
# --------------------------------

@app.get("/", include_in_schema=False)
def home():

    return RedirectResponse(
        url="/index.html"
    )


# --------------------------------
# Health check
# --------------------------------

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "message": "Titanic API is running successfully"
    }


# --------------------------------
# Prediction route
# --------------------------------

@app.post("/predict")
def predict_survival(data: PassengerData):

    try:

        input_data = pd.DataFrame([{
            "Pclass": data.Pclass,
            "Sex": data.Sex,
            "Age": data.Age,
            "SibSp": data.SibSp,
            "Parch": data.Parch,
            "Fare": data.Fare,
            "Embarked": data.Embarked
        }])

        prediction = int(
            model.predict(input_data)[0]
        )

        if prediction == 1:

            result = "Survived"

        else:

            result = "Not Survived"

        return {
            "success": True,
            "prediction": prediction,
            "result": result
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )