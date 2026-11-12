from pathlib import Path
from typing import Literal

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Project folder
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "public"

# FastAPI application
app = FastAPI(
    title="Titanic Survival Prediction",
    description="Predict Titanic passenger survival",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Load trained pipeline
model = joblib.load(BASE_DIR / "Svm_model.pkl")


# Input validation
class PassengerData(BaseModel):
    Pclass: Literal[1, 2, 3]
    Sex: Literal["male", "female"]
    Age: float = Field(ge=0, le=100)
    SibSp: int = Field(ge=0)
    Parch: int = Field(ge=0)
    Fare: float = Field(ge=0)
    Embarked: Literal["C", "Q", "S"]


# Home route
@app.get("/", include_in_schema=False)
def home():
    return FileResponse(STATIC_DIR / "index.html")


# Health check
@app.get("/health")
def health():
    return {"status": "healthy"}


# Prediction route
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

        prediction = int(model.predict(input_data)[0])

        result = "Survived" if prediction == 1 else "Not Survived"

        return {
            "prediction": prediction,
            "result": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Serve CSS and JavaScript
app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static"
)