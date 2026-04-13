import requests
import pandas as pd
from geopy.geocoders import Nominatim
import json
from datetime import datetime, timedelta
import time

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
        self.geolocator = Nominatim(user_agent="building_energy_app")
        self.base_url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
        self.cache = {}
        self.cache_ttl = timedelta(hours=24)
        self.nasa_circuit_breaker = CircuitBreaker()

    def get_lat_lon(self, city_name):
        # Pre-calculated common city coordinates to avoid geocoding limits
        common_cities = {
            "mumbai, india": (19.0760, 72.8777), "delhi, india": (28.7041, 77.1025),
            "bangalore, india": (12.9716, 77.5946), "hyderabad, india": (17.3850, 78.4867),
            "ahmedabad, india": (23.0225, 72.5714), "chennai, india": (13.0827, 80.2707),
            "kolkata, india": (22.5726, 88.3639), "surat, india": (21.1702, 72.8311),
            "pune, india": (18.5204, 73.8567), "jaipur, india": (26.9124, 75.7873),
            "lucknow, india": (26.8467, 80.9462), "kanpur, india": (26.4499, 80.3319)
        }
        city_lower = city_name.lower().strip()
        if city_lower in common_cities:
            return common_cities[city_lower]

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

    def fetch_climate_data(self, lat, lon):
        cache_key = f"climate_{round(lat,2)}_{round(lon,2)}"
        
        if cache_key in self.cache:
            entry = self.cache[cache_key]
            if datetime.now() - entry['timestamp'] < self.cache_ttl:
                data = entry['data'].copy()
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
                        
                        cdd = sum([max(0, t - 18.3) * 30.4 for t in monthly_temps])
                        hdd = sum([max(0, 18.3 - t) * 30.4 for t in monthly_temps])
            
                        climate_data = {
                            "annual_mean_temp": annual_mean_temp,
                            "annual_solrad": annual_solrad,
                            "cdd": round(cdd, 2),
                            "hdd": round(hdd, 2),
                            "monthly_temps": monthly_temps,
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
