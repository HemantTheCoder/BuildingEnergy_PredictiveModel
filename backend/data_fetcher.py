import requests
import pandas as pd
from geopy.geocoders import Nominatim
import json
from datetime import datetime

class ClimateFetcher:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="building_energy_app")
        self.base_url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
        self.cache = {}

    def get_lat_lon(self, city_name):
        if city_name in self.cache:
            return self.cache[city_name].get('lat'), self.cache[city_name].get('lon')
        
        try:
            location = self.geolocator.geocode(city_name, timeout=10)
            if location:
                return location.latitude, location.longitude
        except Exception as e:
            print(f"Geocoding error: {e}")
        return None, None

    def fetch_climate_data(self, lat, lon):
        cache_key = f"{round(lat,2)}_{round(lon,2)}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        params = {
            "parameters": "T2M,RH2M,ALLSKY_SFC_SW_DWN",
            "community": "SB",
            "longitude": lon,
            "latitude": lat,
            "format": "JSON"
        }
        
        try:
            response = requests.get(self.base_url, params=params, timeout=15)
            if response.status_code == 200:
                data = response.json()
                # Extract parameters
                # NASA POWER Climatology returns 13 values per parameter (12 months + annual average)
                # Index 12 is usually the annual average
                parameters = data['properties']['parameter']
                
                # Simplified monthly temperature array
                monthly_temps = list(parameters['T2M'].values())[:12]
                annual_mean_temp = parameters['T2M']['ANN']
                annual_solrad = parameters['ALLSKY_SFC_SW_DWN']['ANN']
                
                # Simple CDD calculation (Base 18.3C or 65F)
                # CDD = sum(max(0, Ti - 18.3)) for all days. 
                # From monthly averages, we can estimate CDD.
                # HDD = sum(max(0, 18.3 - Ti)) for all days.
                
                cdd = sum([max(0, t - 18.3) * 30.4 for t in monthly_temps])
                hdd = sum([max(0, 18.3 - t) * 30.4 for t in monthly_temps])
    
                climate_data = {
                    "annual_mean_temp": annual_mean_temp,
                    "annual_solrad": annual_solrad,
                    "cdd": round(cdd, 2),
                    "hdd": round(hdd, 2),
                    "monthly_temps": monthly_temps,
                    "source": "NASA POWER API Climatology"
                }
                self.cache[cache_key] = climate_data
                return climate_data
            else:
                print(f"Error fetching NASA POWER data: {response.status_code}")
                return None
        except Exception as e:
            print(f"NASA API Error: {e}")
            return None

if __name__ == "__main__":
    fetcher = ClimateFetcher()
    city = "Ahmedabad, India"
    lat, lon = fetcher.get_lat_lon(city)
    if lat:
        print(f"Fetching data for {city} ({lat}, {lon})...")
        data = fetcher.fetch_climate_data(lat, lon)
        print(json.dumps(data, indent=2))
    else:
        print("City not found.")
