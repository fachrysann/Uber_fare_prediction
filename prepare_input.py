import networkx as nx
import osmnx as ox
import pandas as pd
from dateutil import parser
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def euclidean_distance_km(lat1, lon1, lat2, lon2):
    """
    Calculate approximate distance using OSMnx euclidean distance
    Returns distance in kilometers
    """
    try:
        # Use OSMnx built-in distance calculation
        distance_m = ox.distance.euclidean_dist_vec(lat1, lon1, lat2, lon2)
        return distance_m / 1000  # Convert to kilometers
    except Exception as e:
        logger.error(f"Error calculating euclidean distance: {e}")
        return 0.0

def validate_coordinates(lat, lon):
    """Validate if coordinates are reasonable"""
    return (-90 <= lat <= 90) and (-180 <= lon <= 180)

def find_nearest_nodes_safe(G, pickup_lon, pickup_lat, dropoff_lon, dropoff_lat):
    """
    Safely find nearest nodes with fallback options
    """
    try:
        # Validate coordinates first
        if not all([validate_coordinates(pickup_lat, pickup_lon),
                   validate_coordinates(dropoff_lat, dropoff_lon)]):
            raise ValueError("Invalid coordinate values")
        
        # Find nearest nodes
        pickup_node = ox.distance.nearest_nodes(G, pickup_lon, pickup_lat)
        dropoff_node = ox.distance.nearest_nodes(G, dropoff_lon, dropoff_lat)
        
        # Verify nodes exist in graph
        if pickup_node not in G.nodes or dropoff_node not in G.nodes:
            raise ValueError("Nodes not found in graph")
        
        logger.info(f"Found nodes: pickup={pickup_node}, dropoff={dropoff_node}")
        return pickup_node, dropoff_node
        
    except Exception as e:
        logger.error(f"Error finding nearest nodes: {e}")
        raise

def calculate_route_with_fallback(G, pickup_node, dropoff_node, pickup_lat, pickup_lon, dropoff_lat, dropoff_lon):
    """
    Calculate route with multiple fallback strategies
    """
    route_nodes = []
    distance_m = 0
    
    try:
        # Primary method: shortest path by length
        route_nodes = nx.shortest_path(G, pickup_node, dropoff_node, weight='length')
        distance_m = nx.shortest_path_length(G, pickup_node, dropoff_node, weight='length')
        logger.info(f"Route found with {len(route_nodes)} nodes, distance: {distance_m:.2f}m")
        
    except nx.NetworkXNoPath:
        logger.warning("No path found with length weight, trying without weight")
        try:
            # Fallback 1: shortest path without weight
            route_nodes = nx.shortest_path(G, pickup_node, dropoff_node)
            # Calculate distance manually
            total_distance = 0
            for i in range(len(route_nodes) - 1):
                node1, node2 = route_nodes[i], route_nodes[i + 1]
                if G.has_edge(node1, node2):
                    edge_data = G[node1][node2]
                    if isinstance(edge_data, dict):
                        # Multiple edges case
                        edge_length = min(edge.get('length', 0) for edge in edge_data.values())
                    else:
                        edge_length = edge_data.get('length', 0)
                    total_distance += edge_length
            distance_m = total_distance
            logger.info(f"Fallback route found with {len(route_nodes)} nodes")
            
        except nx.NetworkXNoPath:
            logger.warning("No path found, using euclidean distance")
            # Fallback 2: use straight-line distance
            distance_km = euclidean_distance_km(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)
            distance_m = distance_km * 1000
            route_nodes = [pickup_node, dropoff_node]  # Simple direct connection
    
    except Exception as e:
        logger.error(f"Error calculating route: {e}")
        # Final fallback: euclidean distance
        distance_km = euclidean_distance_km(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)
        distance_m = distance_km * 1000
        route_nodes = [pickup_node, dropoff_node]
    
    return route_nodes, distance_m

def prepare_input_from_string(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon, 
                            dt_str, G, passenger_count=1):
    """
    Main function to prepare input features and route coordinates
    EXACTLY matching the original model's expected features
    """
    try:
        # Parse datetime
        try:
            dt = parser.parse(dt_str)
        except Exception as e:
            logger.error(f"Error parsing datetime '{dt_str}': {e}")
            raise ValueError(f"Invalid datetime format: {dt_str}")
        
        # Validate graph
        if G is None or len(G.nodes) == 0:
            raise ValueError("Invalid or empty graph provided")
        
        # Validate coordinates
        if not all([validate_coordinates(pickup_lat, pickup_lon),
                   validate_coordinates(dropoff_lat, dropoff_lon)]):
            raise ValueError("Invalid coordinate values")
        
        # Check if pickup and dropoff are the same
        if abs(pickup_lat - dropoff_lat) < 0.0001 and abs(pickup_lon - dropoff_lon) < 0.0001:
            logger.warning("Pickup and dropoff locations are very close")
            # Return minimal trip with exact original features
            df = pd.DataFrame({
                'passenger_count': [max(1, min(6, passenger_count))],
                'distance_km': [0.1],  # Minimum distance
                'hour': [dt.hour],
                'is_weekend': [int(dt.weekday() in [5, 6])],
            })
            
            # Add month one-hot encoding (exactly 12 features)
            for m in range(1, 13):
                df[f'month_{m}'] = int(m == dt.month)
            
            # Add day of week one-hot encoding (exactly 7 features)
            for d in range(7):
                df[f'dow_{d}'] = int(d == dt.weekday())
            
            route_coords = [(pickup_lat, pickup_lon), (dropoff_lat, dropoff_lon)]
            return df, route_coords
        
        # Find nearest nodes
        pickup_node, dropoff_node = find_nearest_nodes_safe(
            G, pickup_lon, pickup_lat, dropoff_lon, dropoff_lat
        )
        
        # Calculate route
        route_nodes, distance_m = calculate_route_with_fallback(
            G, pickup_node, dropoff_node, pickup_lat, pickup_lon, dropoff_lat, dropoff_lon
        )
        
        # Convert distance to kilometers
        distance_km = distance_m / 1000 if distance_m else 0.0
        
        # Ensure minimum distance for very short trips
        if distance_km < 0.1:
            distance_km = max(0.1, euclidean_distance_km(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon))
        
        # Convert route nodes to coordinates for visualization
        route_coords = []
        if route_nodes and len(route_nodes) > 0:
            try:
                route_coords = [(G.nodes[n]['y'], G.nodes[n]['x']) for n in route_nodes 
                              if n in G.nodes and 'y' in G.nodes[n] and 'x' in G.nodes[n]]
            except Exception as e:
                logger.warning(f"Error converting route to coordinates: {e}")
                # Fallback to straight line
                route_coords = [(pickup_lat, pickup_lon), (dropoff_lat, dropoff_lon)]
        else:
            # No route found, use straight line
            route_coords = [(pickup_lat, pickup_lon), (dropoff_lat, dropoff_lon)]
        
        # Create feature dataframe with EXACT original features only
        df = pd.DataFrame({
            'passenger_count': [max(1, min(6, passenger_count))],  # Clamp between 1-6
            'distance_km': [max(0, distance_km)],  # Ensure non-negative
            'hour': [dt.hour],
            'is_weekend': [int(dt.weekday() in [5, 6])],
        })
        
        # One-hot encode months (1-12) - exactly as in original
        for m in range(1, 13):
            df[f'month_{m}'] = int(m == dt.month)
        
        # One-hot encode days of week (0-6) - exactly as in original
        for d in range(7):
            df[f'dow_{d}'] = int(d == dt.weekday())
        
        # Verify feature count (should be exactly 23 features)
        expected_features = ['passenger_count', 'distance_km', 'hour', 'is_weekend'] + \
                          [f'month_{m}' for m in range(1, 13)] + \
                          [f'dow_{d}' for d in range(7)]
        
        logger.info(f"Created feature dataframe with shape: {df.shape}")
        logger.info(f"Feature columns: {list(df.columns)}")
        logger.info(f"Expected features: {len(expected_features)}, Actual features: {len(df.columns)}")
        
        if len(df.columns) != 23:
            logger.error(f"Feature count mismatch! Expected 23, got {len(df.columns)}")
            logger.error(f"Missing or extra features: {set(expected_features) - set(df.columns)} | {set(df.columns) - set(expected_features)}")
        
        return df, route_coords
    
    except Exception as e:
        logger.error(f"Error in prepare_input_from_string: {e}")
        raise