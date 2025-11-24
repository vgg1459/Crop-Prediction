from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pickle
import pandas as pd

app = Flask(__name__)
CORS(app)  # Allows cross-origin requests

# 1. Load Model and Encoder
rf_model = joblib.load('crop_prediction_model.pkl')
with open('label_encoder.pkl', 'rb') as f:
    label_encoder = pickle.load(f)

# 2. Load District Data
district_data = pd.read_csv('data/combined_soil_weather_data.csv')
district_data.columns = district_data.columns.str.strip()

# Add a default 'humidity' column if it's missing
if "humidity" not in district_data.columns:
    district_data["humidity"] = 80.0

def recommend_top_crops_by_district(district_name, district_df, model, label_encoder, top_n=3):
    """Return top N crops for the specified district."""
    district_name_lower = district_name.lower()
    matched_row = district_df[district_df['District'].str.lower() == district_name_lower]
    
    if matched_row.empty:
        return None, f"Sorry, no data available for the district: {district_name}"

    try:
        features = matched_row[['N', 'P', 'K', 'pH', 'temperature', 'rainfall', 'humidity']].values
    except KeyError:
        return None, "Error: Required columns are missing in the district dataset."
    
    # Get probability for each crop
    crop_probabilities = model.predict_proba(features)[0]
    # Indices of top N crops in descending order
    top_crop_indices = crop_probabilities.argsort()[-top_n:][::-1]
    # Decode crop labels
    top_crops = label_encoder.inverse_transform(top_crop_indices)
    top_probs = crop_probabilities[top_crop_indices]
    
    return list(zip(top_crops, top_probs)), None

@app.route('/predict_crop', methods=['GET', 'POST'])
def predict_crop():
    if request.method == 'GET':
        return "This endpoint also supports GET, but you must POST to get predictions."
    
    data = request.get_json()
    if not data or 'district' not in data:
        return jsonify({'error': 'No district provided'}), 400

    district_name = data['district']
    predictions, error = recommend_top_crops_by_district(
        district_name, district_data, rf_model, label_encoder, top_n=3
    )

    if error:
        return jsonify({'error': error}), 400

    # Format response
    results = [{'crop': crop, 'probability': float(prob)} for crop, prob in predictions]
    return jsonify({'predictions': results})

@app.route('/')
def home():
    return "Hello, this is the Crop Prediction API."

if __name__ == '__main__':
    app.run(debug=True)
