import pandas as pd
import os

# These are the columns we agreed on for the deck format, used in validation
REQUIRED_COLUMNS = ['Question_ID', 'Question_Text', 'Correct_Answer', 'Predefined_Fake']

def validate_and_parse_csv(file_path: str):
    """
    Checks if the CSV is valid; if valid- returns a json 
    The first element of the json is status: success; succesive element is data, a list of question objects
    """
    try:
        # Read the CSV using pandas
        df = pd.read_csv(file_path)
        
        # Check if all required columns are present [cite: 58]
        if not all(col in df.columns for col in REQUIRED_COLUMNS):
            missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
            return {"status": "error", "message": f"Missing columns: {missing}"}

        # Convert the spreadsheet rows into a list of dictionaries for the API
        questions = df.to_dict(orient='records')
        return {"status": "success", "data": questions}
    
    except Exception as e:
        return {"status": "error", "message": str(e)}
    