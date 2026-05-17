from fastapi import FastAPI

app = FastAPI(title="SpendSense AI Service")

@app.get("/health")
def health():
    return {"status": "ok"}
