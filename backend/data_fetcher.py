import requests
import pandas as pd
from geopy.geocoders import Nominatim
import json
from datetime import datetime, timedelta
import time
from functools import lru_cache

class CircuitBreaker:
    def __init__(self, failure_threshold=3, reset_timeout=60):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.failures = 0
        self.state = "CLOSED" # "CLOSED", "OPEN", "HALF-OPEN"
        self.last_failure_time = None

    def record_failure(self):
        self.failures += 1
        print(f"Circuit Breaker failure recorded. Count: {self.failures}")
        if self.failures >= self.failure_threshold:
            self.state = "OPEN"
            self.last_failure_time = datetime.now()
            print(f"CIRCUIT BREAKER OPENED at {self.last_failure_time}")

    def record_success(self):
        if self.state == "HALF-OPEN" or self.failures > 0:
            self.reset()

    def reset(self):
        self.failures = 0
        self.state = "CLOSED"
        self.last_failure_time = None
        print("CIRCUIT BREAKER RESET TO CLOSED")

    def can_execute(self):
        if self.state == "CLOSED":
            return True
        if self.state == "OPEN":
            if (datetime.now() - self.last_failure_time).total_seconds() > self.reset_timeout:
                self.state = "HALF-OPEN"
                print("CIRCUIT BREAKER HALF-OPEN. Testing service...")
                return True
            return False
        if self.state == "HALF-OPEN":
            return True
        return True

class ClimateFetcher:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="Building_Energy_App_Edu/1.0")
        self.base_url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
        self.cache = {}
        self.cache_ttl = timedelta(hours=24)
        self.nasa_circuit_breaker = CircuitBreaker()
        
        self.common_cities = {}
        # Pre-calculated 100% offline city coordinates to avoid geocoding limits
        import os
        coords_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "city_coords.json")
        if os.path.exists(coords_path):
            try:
                with open(coords_path, 'r') as f:
                    self.common_cities = json.load(f)
            except Exception as e:
                print(f"Failed to load offline city coords: {e}")

    @lru_cache(maxsize=64)
    def get_lat_lon(self, city_name):
        city_lower = city_name.lower().strip()
        if city_lower in self.common_cities:
            coords = self.common_cities[city_lower]
            return coords[0], coords[1]

        if city_name in self.cache:
            entry = self.cache[city_name]
            if datetime.now() - entry.get('timestamp', datetime.min) < self.cache_ttl:
                return entry.get('lat'), entry.get('lon')
        
        try:
            # Change user agent to be more specific to avoid basic blocks
            self.geolocator.headers = {"User-Agent": "Building_Energy_App_Edu/1.0"}
            location = self.geolocator.geocode(city_name, timeout=10)
            if location:
                self.cache[city_name] = {"lat": location.latitude, "lon": location.longitude, "timestamp": datetime.now()}
                return location.latitude, location.longitude
        except Exception as e:
            print(f"Geocoding error: {e}")
        return None, None

    def fetch_imd_weather_data(self, lat, lon):
        '''
        Stub for India Meteorological Department (IMD) API.
        This provides real-time local weather streams.
        Returns None until fully integrated.
        '''
        print("IMD Data fetch simulated...")
        return None

    @lru_cache(maxsize=64)
    def fetch_climate_data(self, lat, lon):
        cache_key = f"climate_{round(lat,2)}_{round(lon,2)}"
        
        if cache_key in self.cache:
            entry = self.cache[cache_key]
            if datetime.now() - entry['timestamp'] < self.cache_ttl:
                import copy
                data = copy.deepcopy(entry['data'])
                if not data['metadata']['source'].startswith("Cached"):
                    data['metadata']['source'] = "Cached " + data['metadata']['source']
                data['metadata']['confidence_score'] = 0.9 # Decreased confidence since it's cached
                return data

        # 1. Try IMD First
        imd_data = self.fetch_imd_weather_data(lat, lon)
        if imd_data:
            imd_data['metadata'] = {
                "source": "India Meteorological Department (IMD) Live API",
                "retrieval_date": datetime.now().isoformat(),
                "confidence_score": 0.99,
                "license": "Government of India Open Data License"
            }
            self.cache[cache_key] = {"data": dict(imd_data), "timestamp": datetime.now()}
            return imd_data

        # 2. Fallback to NASA POWER
        if self.nasa_circuit_breaker.can_execute():
            params = {
                "parameters": "T2M,RH2M,ALLSKY_SFC_SW_DWN",
                "community": "SB",
                "longitude": lon,
                "latitude": lat,
                "format": "JSON"
            }

            max_retries = 3
            backoff_factor = 2

            for attempt in range(max_retries):
                try:
                    response = requests.get(self.base_url, params=params, timeout=15)
                    if response.status_code == 200:
                        self.nasa_circuit_breaker.record_success()
                        data = response.json()
                        parameters = data['properties']['parameter']
                        
                        monthly_temps = list(parameters['T2M'].values())[:12]
                        annual_mean_temp = parameters['T2M']['ANN']
                        annual_solrad = parameters['ALLSKY_SFC_SW_DWN']['ANN']
                        monthly_solrad_raw = list(parameters['ALLSKY_SFC_SW_DWN'].values())[:12]
                        monthly_solrad = [round(float(v), 2) for v in monthly_solrad_raw]
                        
                        DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
                        monthly_cdd = [round(max(0.0, float(t) - 18.3) * d, 1) for t, d in zip(monthly_temps, DAYS_IN_MONTH)]
                        monthly_hdd = [round(max(0.0, 18.3 - float(t)) * d, 1) for t, d in zip(monthly_temps, DAYS_IN_MONTH)]
                        cdd = sum(monthly_cdd)
                        hdd = sum(monthly_hdd)
            
                        climate_data = {
                            "annual_mean_temp": annual_mean_temp,
                            "annual_solrad": annual_solrad,
                            "cdd": round(cdd, 2),
                            "hdd": round(hdd, 2),
                            "monthly_temps": monthly_temps,
                            "monthly_cdd": monthly_cdd,
                            "monthly_hdd": monthly_hdd,
                            "monthly_solrad": monthly_solrad,
                            "metadata": {
                                "source": "NASA POWER API Climatology - Global Fallback",
                                "retrieval_date": datetime.now().isoformat(),
                                "confidence_score": 0.95,
                                "license": "NASA Open Data"
                            }
                        }
                        self.cache[cache_key] = {"data": climate_data, "timestamp": datetime.now()}
                        return climate_data
                    else:
                        print(f"Error fetching NASA POWER data. Status: {response.status_code}")
                        self.nasa_circuit_breaker.record_failure()
                        time.sleep(backoff_factor ** attempt) # Exponential backoff
                except requests.exceptions.RequestException as e:
                    print(f"NASA API Network Error: {e}")
                    self.nasa_circuit_breaker.record_failure()
                    if attempt < max_retries - 1:
                        time.sleep(backoff_factor ** attempt)

        # 3. Fallback to expired cache
        print("Returning stale cache due to API failure.")
        stale_data = self.cache.get(cache_key, {}).get('data')
        if stale_data:
            stale_copy = stale_data.copy()
            stale_copy['metadata']['source'] = "Cached EPW Backup (Stale)"
            stale_copy['metadata']['confidence_score'] = 0.50
            return stale_copy
            
        return None

if __name__ == "__main__":
    fetcher = ClimateFetcher()
    city = "Ahmedabad, India"
    lat, lon = fetcher.get_lat_lon(city)
    if lat:
        print(f"Fetching data for {city} ({lat}, {lon})...")
        data = fetcher.fetch_climate_data(lat, lon)
        print(json.dumps(data, indent=2) if data else "No data retrieved.")
    else:
        print("City not found.")
