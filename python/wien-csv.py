import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates # Optional: For better time formatting
import sys # For exiting on critical errors
import os # To check if files exist

# --- Configuration ---
# List of CSV files to process
csv_file_paths = [
    '2024-09-30_1_vehicle.csv',
    '2024-09-30_2_vehicle.csv',
    '2024-09-30_3_vehicle.csv',
    '2024-09-30_4_vehicle.csv'
]

# Define the columns we need based on the actual header found
timestamp_col = '#DateLog'
raw_lat_col = 'LatGps'
raw_lon_col = 'LonGps'
raw_speed_col = 'SpeedGps'
filtered_lat_col = 'Latitude'
filtered_lon_col = 'Longitude'
filtered_velocity_col = 'Speed'

# --- Data Loading and Preparation ---
all_data = [] # List to hold dataframes from each file

print("Starting data loading...")
for file_path in csv_file_paths:
    if not os.path.exists(file_path):
        print(f"Warning: File not found - {file_path}. Skipping.")
        continue # Skip to the next file if this one doesn't exist

    try:
        # Load the data using pandas, specifying the semicolon delimiter
        # skipinitialspace=True helps handle potential spaces after the delimiter
        temp_df = pd.read_csv(file_path, delimiter=';', skipinitialspace=True, low_memory=False)
        print(f"Successfully loaded {file_path}. Found {len(temp_df)} rows.")
        all_data.append(temp_df)
    except Exception as e:
        print(f"Error loading file {file_path}: {e}")
        print("Skipping this file.")

# Check if any data was loaded
if not all_data:
    print("Error: No data loaded. Please ensure at least one CSV file exists and is readable.")
    sys.exit(1)

# Concatenate all loaded dataframes into one
df = pd.concat(all_data, ignore_index=True)
print(f"Combined data from {len(all_data)} files. Total rows: {len(df)}")
# print("Columns found in combined data:", df.columns.tolist()) # Optional: uncomment to see columns


# --- Data Validation and Cleaning ---
try:
    # Check if required columns exist in the combined dataframe
    required_cols = [timestamp_col, raw_lat_col, raw_lon_col, raw_speed_col, filtered_lat_col, filtered_lon_col, filtered_velocity_col]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        print(f"Error: Missing required columns in combined data: {missing_cols}")
        print("Please double-check the column names in the script match the CSV header exactly.")
        print("Available columns:", df.columns.tolist())
        sys.exit(1) # Exit if essential columns are missing

    # --- Data Cleaning and Type Conversion ---
    # Convert coordinate and speed columns to numeric, coercing errors to NaN
    coord_speed_cols = [raw_lat_col, raw_lon_col, raw_speed_col, filtered_lat_col, filtered_lon_col, filtered_velocity_col]
    print("Converting coordinate and speed columns to numeric...")
    for col in coord_speed_cols:
        # Replace comma decimal separator with dot if necessary
        if df[col].dtype == 'object': # Check if the column is read as string
            # Use .loc to avoid SettingWithCopyWarning
            df.loc[:, col] = df[col].str.replace(',', '.', regex=False)
        df.loc[:, col] = pd.to_numeric(df[col], errors='coerce')
    print("Numeric conversion done.")

    # Drop rows where essential numeric data is missing (NaN) after conversion
    initial_rows = len(df)
    df.dropna(subset=coord_speed_cols, inplace=True)
    rows_dropped = initial_rows - len(df)
    if rows_dropped > 0:
        print(f"Warning: Dropped {rows_dropped} rows due to missing/invalid numeric data in coordinate/speed columns.")

    if df.empty:
        print("Error: No valid data remaining after cleaning. Cannot proceed.")
        sys.exit(1)

    # Convert timestamp column to datetime objects
    # Adjust the format string if your timestamp format is different
    print("Converting timestamp column...")
    try:
        # Attempt conversion, stripping potential extra whitespace from timestamp strings
        df[timestamp_col] = pd.to_datetime(df[timestamp_col].astype(str).str.strip(), format='%Y-%m-%d %H:%M:%S.%f') # Adjust format as needed!
        print("Timestamp converted successfully.")
        # Sort data by timestamp after combining files
        df.sort_values(by=timestamp_col, inplace=True)
        print("Data sorted by timestamp.")
    except ValueError as e:
        print(f"Error converting timestamp column '{timestamp_col}': {e}")
        print("Please check the 'format' argument in pd.to_datetime matches your data's format.")
        print("First few timestamp values:", df[timestamp_col].head().tolist())
        sys.exit(1)

    # --- Calculate Differences ---
    # Calculate the distance between raw GPS and filtered position for each row
    print("Calculating position difference...")
    # Function to calculate Haversine distance between two lat/lon points in meters
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371000  # Radius of Earth in meters
        phi1 = np.radians(lat1)
        phi2 = np.radians(lat2)
        delta_phi = np.radians(lat2 - lat1)
        delta_lambda = np.radians(lon2 - lon1)
        # Handle potential domain errors for arcsin/sqrt
        a_arg = np.sin(delta_phi / 2)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(delta_lambda / 2)**2
        a_arg = np.clip(a_arg, 0, 1) # Ensure argument is within [0, 1]
        c = 2 * np.arcsin(np.sqrt(a_arg)) # Use arcsin which is more stable for small angles
        distance = R * c
        return distance

    df['position_difference_m'] = haversine(
        df[raw_lat_col], df[raw_lon_col],
        df[filtered_lat_col], df[filtered_lon_col]
    )
    print("Position difference calculated.")

    # Calculate the difference between filtered and raw speed
    print("Calculating speed difference...")
    df['speed_difference'] = df[filtered_velocity_col] - df[raw_speed_col]
    print("Speed difference calculated.")


    # --- Plotting ---
    plt.style.use('seaborn-v0_8-darkgrid') # Use a different style for better contrast
    print("Creating plots...")

    # Increase the default font sizes for better readability
    plt.rcParams.update({
        'font.size': 14,
        'axes.titlesize': 16,
        'axes.labelsize': 14,
        'xtick.labelsize': 12,
        'ytick.labelsize': 12,
        'legend.fontsize': 12,
    })

    # Create figure and axes for the plots - NOW 3 ROWS
    # A4 ratio is approximately 1:1.414, using dimensions that better match this ratio
    fig, axs = plt.subplots(3, 1, figsize=(8.3, 11.7), sharex=True) # A4 dimensions in inches

    # Define colors from a palette (e.g., tab10)
    colors = plt.cm.tab10.colors

    # --- Plot 1: Speed Comparison ---
    axs[0].plot(df[timestamp_col], df[filtered_velocity_col], label='Filtered Velocity (Kalman)', color=colors[0], linewidth=1.5, zorder=10) # Color 1
    axs[0].plot(df[timestamp_col], df[raw_speed_col], label='Raw GPS Speed', color=colors[1], linewidth=1.0, alpha=0.7) # Color 2
    axs[0].set_ylabel('Velocity (m/s)')
    axs[0].set_title('Filtered vs Raw GPS Velocity Over Time (Combined Data)')
    axs[0].legend()
    axs[0].grid(True, linestyle='--', alpha=0.6)

    # --- Plot 2: Speed Difference ---
    axs[1].plot(df[timestamp_col], df['speed_difference'], label='Speed Difference (Filtered - Raw)', color=colors[2], linewidth=1.2) # Color 3
    axs[1].set_ylabel('Speed Difference (m/s)')
    axs[1].set_title('Speed Difference Between Filtered and Raw GPS Data')
    axs[1].axhline(0, color='grey', linewidth=0.8, linestyle=':') # Add a zero line for reference
    axs[1].legend()
    axs[1].grid(True, linestyle='--', alpha=0.6)


    # --- Plot 3: Position Difference ---
    axs[2].plot(df[timestamp_col], df['position_difference_m'], label='Raw GPS vs Filtered Position', color=colors[3], linewidth=1.5) # Color 4
    axs[2].set_xlabel('Time')
    axs[2].set_ylabel('Position Difference (m)')
    axs[2].set_title('Positional Difference Between Raw GPS and Kalman Filter Estimate (Combined Data)')
    axs[2].legend()
    axs[2].grid(True, linestyle='--', alpha=0.6)

    # Improve x-axis formatting (optional) for the bottom plot
    try:
        locator = mdates.AutoDateLocator(min_n_ticks=6, max_n_ticks=12)
        formatter = mdates.ConciseDateFormatter(locator)
        axs[2].xaxis.set_major_locator(locator)
        axs[2].xaxis.set_major_formatter(formatter)
        fig.autofmt_xdate(rotation=30, ha='right') # Rotate labels slightly
    except Exception as e:
        print(f"Warning: Could not apply advanced date formatting: {e}")

    # Adjust layout and display the plot
    plt.tight_layout(rect=[0, 0.03, 1, 0.98]) # Adjust layout slightly

    # Save the figure as an image file in the current directory
    save_filename = 'kalman_filter_comparison.png'
    print(f"Saving plot as '{save_filename}'...")
    plt.savefig(save_filename, dpi=300, bbox_inches='tight')
    print(f"Plot saved as '{save_filename}'")

    # Also display the plot
    print("Displaying plot...")
    plt.show()
    print("Plot displayed.")

except FileNotFoundError:
    print(f"Error: Data file not found during loading loop.")
    print("Please ensure the file paths in 'csv_file_paths' are correct and the files exist.")
except KeyError as e:
    print(f"Error: Missing expected column in combined CSV data: {e}")
    print(f"Please ensure your CSV files contain the column '{e}'. Check column names and delimiter.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")
    print("Please check your data format, file paths, column names, and the script configuration.")

