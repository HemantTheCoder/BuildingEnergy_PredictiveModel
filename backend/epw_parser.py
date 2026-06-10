import io
from datetime import datetime

class EPWParser:
    @staticmethod
    def parse_epw_content(content: str, source_name: str = "Uploaded EPW File") -> dict:
        """
        Parses the raw string content of an EPW file to extract climate metrics.
        """
        lines = content.splitlines()
        
        # Parse LOCATION header for city metadata
        location_name = "Custom EPW Location"
        for line in lines:
            if line.startswith('LOCATION'):
                cols = line.split(',')
                if len(cols) >= 4:
                    city = cols[1].strip()
                    country = cols[3].strip()
                    location_name = f"{city}, {country}"
                break
                
        # EPW data typically starts after 8 header lines
        data_lines = [line for line in lines if len(line.split(',')) > 10 and not line.startswith(('LOCATION', 'DESIGN CONDITIONS', 'TYPICAL/EXTREME PERIODS', 'GROUND TEMPERATURES', 'HOLIDAYS/DAYLIGHT SAVINGS', 'COMMENTS', 'DATA PERIODS', 'DICTIONARY'))]
        
        if not data_lines:
            raise ValueError("No valid data found in EPW file.")
            
        temperatures = []
        global_radiation_whm2 = []
        
        for line in data_lines:
            cols = line.split(',')
            try:
                # Column 6 is Dry Bulb Temperature (C)
                temp = float(cols[6])
                temperatures.append(temp)
                
                # Column 13 is Global Horizontal Radiation (Wh/m2)
                rad = float(cols[13])
                global_radiation_whm2.append(rad)
            except (ValueError, IndexError):
                continue
                
        if not temperatures:
            raise ValueError("Failed to extract temperature data from EPW.")

        # Calculate CDD and HDD (base 18.3C)
        # EPW provides hourly data. We will calculate hourly degree hours and divide by 24.
        cdd = sum([max(0, t - 18.3) for t in temperatures]) / 24.0
        hdd = sum([max(0, 18.3 - t) for t in temperatures]) / 24.0
        
        annual_mean_temp = sum(temperatures) / len(temperatures)
        
        # Annual Solar Radiation (kWh/m2)
        # Sum of hourly Wh/m2 gives annual Wh/m2. Divide by 1000 for kWh/m2.
        annual_solrad = sum(global_radiation_whm2) / 1000.0
        
        # Aggregate monthly temps for the UI
        # We assume 8760 hours starting Jan 1st.
        # Month lengths in hours (non-leap year): 744, 672, 744, 720, 744, 720, 744, 744, 720, 744, 720, 744
        month_hours = [744, 672, 744, 720, 744, 720, 744, 744, 720, 744, 720, 744]
        monthly_temps = []
        
        idx = 0
        for hours in month_hours:
            month_slice = temperatures[idx:idx+hours]
            if month_slice:
                monthly_temps.append(round(sum(month_slice)/len(month_slice), 2))
            else:
                monthly_temps.append(0)
            idx += hours
            
        climate_data = {
            "city": location_name,
            "annual_mean_temp": round(annual_mean_temp, 2),
            "annual_solrad": round(annual_solrad, 2),
            "cdd": round(cdd, 2),
            "hdd": round(hdd, 2),
            "monthly_temps": monthly_temps,
            "metadata": {
                "source": source_name,
                "retrieval_date": datetime.now().isoformat(),
                "confidence_score": 0.99, # Highly confident in precise EPW
                "license": "climate.onebuilding.org or User Upload"
            }
        }
        
        return climate_data
