from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.schemas import DataUploadResponse
from app.services.data_ingestion import parse_and_ingest_file

router = APIRouter()

@router.post("/api/upload", response_model=DataUploadResponse)
async def upload_dataset(file: UploadFile = File(...)):
    """
    Accepts user dataset uploads in formats: .csv, .xlsx, .xls, .json, .zip.
    Ingests records into the unified SQLite database and refreshes the process twin engine.
    """
    filename = file.filename or "uploaded_dataset.csv"
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        
        result = parse_and_ingest_file(content, filename)
        return result
    except HTTPException as he:
        raise he
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data ingestion failed: {str(e)}")
