from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import os

# Import your two separate modules
from deck_manager import validate_and_parse_csv
from generate_game_summary import generate_excel_report 

app = FastAPI()

@app.get("/")
async def root():
    """Verify the server is alive."""
    return {"message": "Backend API is active"}

@app.post("/upload-deck")
async def upload_deck(file: UploadFile = File(...)):
    """
    Endpoint for the Host to upload a CSV deck.
    Supports FR-5: Import/Export decks. [cite: 57]
    """
    # Create the 'decks' folder if it doesn't exist
    if not os.path.exists("decks"):
        os.makedirs("decks")
        
    file_location = f"decks/{file.filename}"
    
    # Save the file locally so we can process it [cite: 7]
    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())
    
    # Use our deck_manager to validate and return the data
    result = validate_and_parse_csv(file_location)
    return result