from flask import Flask, request, render_template
import xgboost as xgb
import osmnx as ox
import pandas as pd
import networkx as nx
from datetime import datetime
from prepare_input import prepare_input_from_string
import os

# -----------------------------
# 1️⃣ Buat Flask app
# -----------------------------
app = Flask(__name__)

# -----------------------------
# 2️⃣ Load Graph jalan NYC
# -----------------------------
ox.settings.log_console = True
ox.settings.use_cache = True

# NYC bounding box coordinates
north, south = 40.9176, 40.4774
east, west = -73.7004, -74.2591

graph_file = "nyc_graph.graphml"

print("Loading NYC road graph... this may take a minute")
try:
    if os.path.exists(graph_file):
        print("GraphML file found, loading locally...")
        G = ox.load_graphml(graph_file)
    else:
        print("GraphML not found, downloading from OSM...")
        G = ox.graph_from_bbox(north, south, east, west, network_type="drive")
        ox.save_graphml(G, filepath=graph_file)
    print("Graph loaded successfully!")
except Exception as e:
    print(f"Error loading graph: {e}")
    G = None

# -----------------------------
# 3️⃣ Load model XGBoost
# -----------------------------
try:
    xgb_model = xgb.XGBRegressor()
    xgb_model.load_model("xgb_fare_model.json")
    print("XGBoost model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    xgb_model = None

# -----------------------------
# 4️⃣ Helper functions
# -----------------------------
def validate_nyc_bounds(lat, lon):
    """Check if coordinates are within NYC boundaries"""
    return (south <= lat <= north) and (west <= lon <= east)

def validate_inputs(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon, date_str, hour, passenger_count):
    """Validate all user inputs"""
    errors = []
    
    # Validate coordinates
    try:
        if not validate_nyc_bounds(pickup_lat, pickup_lon):
            errors.append("Pickup location must be within NYC boundaries")
        
        if not validate_nyc_bounds(dropoff_lat, dropoff_lon):
            errors.append("Dropoff location must be within NYC boundaries")
    except:
        errors.append("Invalid coordinate values")
    
    # Validate date
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        errors.append("Invalid date format")
    
    # Validate hour
    try:
        if not (0 <= hour <= 23):
            errors.append("Hour must be between 0 and 23")
    except:
        errors.append("Invalid hour value")
    
    # Validate passenger count
    try:
        if not (1 <= passenger_count <= 6):
            errors.append("Passenger count must be between 1 and 6")
    except:
        errors.append("Invalid passenger count")
    
    return errors

# -----------------------------
# 5️⃣ Route utama
# -----------------------------
@app.route("/", methods=["GET", "POST"])
def index():
    current_date = datetime.now().strftime('%Y-%m-%d')
    
    if request.method == "POST":
        print("POST request received")
        
        # Check if required components are loaded
        if G is None:
            print("Graph not loaded")
            return render_template("index.html", 
                                 error="Road network data not available. Please try again later.",
                                 route_coords=[],
                                 current_date=current_date)
        
        if xgb_model is None:
            print("Model not loaded")
            return render_template("index.html", 
                                 error="Prediction model not available. Please try again later.",
                                 route_coords=[],
                                 current_date=current_date)
        
        try:
            # Check if all required form fields are present
            required_fields = ["pickup_lat", "pickup_lon", "dropoff_lat", "dropoff_lon", "date", "hour", "passenger_count"]
            missing_fields = []
            
            for field in required_fields:
                if field not in request.form or not request.form[field].strip():
                    missing_fields.append(field)
            
            if missing_fields:
                error_msg = f"Missing required fields: {', '.join(missing_fields)}"
                print(f"Missing fields: {missing_fields}")
                return render_template("index.html", 
                                     error=error_msg,
                                     route_coords=[],
                                     current_date=current_date)
            
            # Get and convert form data
            print("Extracting form data...")
            pickup_lat = float(request.form["pickup_lat"])
            pickup_lon = float(request.form["pickup_lon"])
            dropoff_lat = float(request.form["dropoff_lat"])
            dropoff_lon = float(request.form["dropoff_lon"])
            passenger_count = int(request.form["passenger_count"])
            date_str = request.form["date"].strip()
            hour = int(request.form["hour"])
            
            print(f"Form data: pickup=({pickup_lat}, {pickup_lon}), dropoff=({dropoff_lat}, {dropoff_lon})")
            print(f"Date: {date_str}, Hour: {hour}, Passengers: {passenger_count}")
            
            # Validate inputs
            validation_errors = validate_inputs(
                pickup_lat, pickup_lon, dropoff_lat, dropoff_lon, 
                date_str, hour, passenger_count
            )
            
            if validation_errors:
                error_msg = "Validation errors: " + "; ".join(validation_errors)
                print(f"Validation errors: {validation_errors}")
                return render_template("index.html", 
                                     error=error_msg,
                                     route_coords=[],
                                     current_date=current_date)
            
            # Create datetime string
            datetime_str = f"{date_str} {hour:02d}:00:00"
            print(f"DateTime string: {datetime_str}")
            
            # Prepare input and calculate route
            try:
                print("Calling prepare_input_from_string...")
                X_user, route_coords = prepare_input_from_string(
                    pickup_lat, pickup_lon,
                    dropoff_lat, dropoff_lon,
                    datetime_str, G,
                    passenger_count
                )
                
                print(f"Features prepared successfully. Shape: {X_user.shape}")
                print(f"Feature columns: {list(X_user.columns)}")
                print(f"Route coordinates: {len(route_coords) if route_coords else 0} points")
                
                # Check if route was found
                distance_km = X_user['distance_km'].iloc[0]
                if distance_km <= 0:
                    print("No valid route found (distance = 0)")
                    return render_template("index.html", 
                                         error="No route found between these points. Please try different locations within NYC.",
                                         route_coords=[],
                                         current_date=current_date)
                
                # Make prediction
                print("Making prediction...")
                pred_fare = xgb_model.predict(X_user)[0]
                
                print(f"Raw prediction: {pred_fare}")
                print(f"Distance: {distance_km:.2f} km")
                
                # Ensure positive fare prediction
                if pred_fare < 0:
                    pred_fare = abs(pred_fare)
                
                # Ensure minimum fare
                if pred_fare < 2.50:  # NYC minimum fare
                    pred_fare = 2.50
                
                print(f"Final prediction: ${pred_fare:.2f}")
                
                return render_template(
                    "index.html",
                    predicted_fare=f"${pred_fare:.2f}",
                    distance_km=f"{distance_km:.2f} km",
                    route_coords=route_coords or [],  # <<< PENTING, pastikan selalu list
                    success=True,
                    current_date=current_date
                )
                
            except nx.NetworkXNoPath:
                print("NetworkX: No path found")
                return render_template("index.html", 
                                     error="No route found between these points. Please try different locations.",
                                     route_coords=[],
                                     current_date=current_date)
            
            except Exception as route_error:
                print(f"Route calculation error: {str(route_error)}")
                print(f"Error type: {type(route_error)}")
                return render_template("index.html", 
                                    error="No route found between these points. Please try different locations within NYC.",
                                    route_coords=[],  # <<< tambahkan supaya tidak Undefined
                                    current_date=current_date)
        
        except ValueError as ve:
            print(f"Value error: {str(ve)}")
            return render_template("index.html", 
                                 error=f"Invalid input format: {str(ve)}",
                                 route_coords=[],
                                 current_date=current_date)
        
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            traceback.print_exc()
            return render_template("index.html", 
                                 error=f"An unexpected error occurred: {str(e)}",
                                 route_coords=[],
                                 current_date=current_date)
    
    # GET request - show form
    print("GET request - showing form")
    return render_template("index.html", 
                         predicted_fare=None, 
                         route_coords=[],
                         current_date=current_date)

# -----------------------------
# 6️⃣ Health check endpoint
# -----------------------------
@app.route("/health")
def health_check():
    """Simple health check endpoint"""
    status = {
        "graph_loaded": G is not None,
        "model_loaded": xgb_model is not None,
        "status": "healthy" if (G is not None and xgb_model is not None) else "degraded"
    }
    return status

# -----------------------------
# 7️⃣ Debug endpoint
# -----------------------------
@app.route("/debug", methods=["POST"])
def debug_form():
    """Debug endpoint to test form data"""
    print("=== DEBUG ENDPOINT ===")
    print("Form data:", dict(request.form))
    print("Content-Type:", request.content_type)
    return {
        "status": "received", 
        "form_data": dict(request.form),
        "content_type": request.content_type
    }

# -----------------------------
# 8️⃣ Jalankan server
# -----------------------------
if __name__ == "__main__":
    print("Starting Flask application...")
    app.run(debug=True, use_reloader=False, host='0.0.0.0', port=5000)