import csv
import re
from typing import Dict, Optional
from datetime import datetime

# Normal case split appropriately
# MORGAN DANIEL 200000001431899565 KIT AMAZON 608371
# Name: MORGAN DANIEL
# Reference: KIT AMAZON

# when no random codes, split words put codes in reference
# EDIN UNIVERSITY EUSU MSL INCOME
# Name: EDIN UNIVERSITY EUSU
# Reference: MSL INCOME

# FREDDIE KELLEY GRE 100000001416617685 FLYERS + POSTERS 600409     10 20SEP24 19:18
# Name: FREDDIE KELLEY GRE
# Reference: FLYERS + POSTERS

# When no random codes, split words put codes in reference
# PLYRDATA TGRSZLFJKM7EL3KG7V
# Name: PLYRDATA
# Reference: TGRSZLFJKM7EL3KG7V

# IONOS CLOUD LTD. V19598536-63254174
# Name: IONOS CLOUD LTD.
# Reference: V19598536-63254174

# FINLAY M DOWER 100000001458679528 UMPIRE 834700     10 02DEC24 14:56
# Name: FINLAY M DOWER
# Reference: UMPIRE

# SANTA COHU DAVIES 100000001458675129 UMP SEM1 779112     10 02DEC24 14:50
# Name: SANTA COHU DAVIES
# Reference: UMP SEM1

def clean_string(s: str) -> str:
    """Remove extra whitespace and trim."""
    return ' '.join(s.split())

def parse_dd_transaction(description: str) -> Dict[str, str]:
    """Parse Direct Debit transactions."""
    if description.startswith('PLYRDATA'):
        return {
            'name': 'PLYRDATA',
            'reference': description.replace('PLYRDATA', '').strip()
        }
    elif description.startswith(('IONOS CLOUD LTD.', '1&1 INTERNET LTD.')):
        parts = description.split(' ', 3)
        name = ' '.join(parts[:3])
        reference = parts[3] if len(parts) > 3 else ''
        return {'name': name, 'reference': reference}
    return {'name': description, 'reference': ''}

def parse_bp_transaction(description: str) -> Dict[str, str]:
    """Parse Bank Payment transactions."""
    if description.startswith('EDIN UNIVERSITY SU'):
        parts = description.split(' ', 3)  # Split after "SU"
        if len(parts) > 3:
            return {
                'name': 'EDIN UNIVERSITY SU',
                'reference': parts[3]
            }
    elif 'EDIN UNIVERSITY EUSU MSL INCOME' in description:
        return {
            'name': 'EDIN UNIVERSITY EUSU',
            'reference': 'MSL INCOME'
        }
    return {'name': description, 'reference': ''}

def parse_fpo_fpi_transaction(description: str) -> Dict[str, str]:
    """Parse Faster Payment (incoming/outgoing) transactions."""
    # Handle XMAS MEALS / CHRISTMASMEALS cases first
    if 'XMAS MEALS' in description or 'CHRISTMASMEALS' in description:
        # Try to extract name and meal reference
        # Pattern matches: NAME followed by XMAS MEALS/CHRISTMASMEALS and optional details
        pattern = r'^(.*?)(?:XMAS MEALS|CHRISTMASMEALS\w*)\s*(?:\d{15}|\w{16,}|\d{6}).*$'
        match = re.match(pattern, description)
        if match:
            name = match.group(1).strip()
            # Extract the meal reference (e.g., M1, 7S, etc.)
            meal_ref = ''
            if 'M1' in description:
                meal_ref = 'M1'
            elif 'M6S' in description:
                meal_ref = 'M6S'
            elif '7S' in description:
                meal_ref = '7S'
            elif '4S' in description:
                meal_ref = '4S'
            return {
                'name': name,
                'reference': f'XMAS MEALS {meal_ref}'.strip()
            }
    
    # Try to find the pattern: [3 digits][15 digits] followed by reference and [6 digits]
    pattern = r'^(.*?)\s+(\d{3})(\d{15})\s+(.*?)(?:\s+(\d{6})\s+.*)?$'
    match = re.match(pattern, description)
    
    if match:
        name, prefix, ref_number, reference_part, account_code = match.groups()
        # Clean up the reference part
        reference = reference_part.strip() if reference_part else ''
        return {
            'name': name.strip(),
            'reference': reference
        }
    
    return {'name': description, 'reference': ''}

def parse_transaction_description(description: str, transaction_type: str) -> Dict[str, str]:
    """
    Parse a transaction description based on its type.
    Returns a dictionary with 'name' and 'reference' keys.
    """
    # Clean the input
    description = clean_string(description)
    
    # Parse based on transaction type
    if transaction_type == 'DD':
        return parse_dd_transaction(description)
    elif transaction_type == 'BP':
        return parse_bp_transaction(description)
    elif transaction_type in ['FPO', 'FPI']:
        return parse_fpo_fpi_transaction(description)
    else:  # BGC and other types
        return {'name': description, 'reference': ''}

def process_transactions(filename: str) -> None:
    """Process the transactions CSV file and analyze descriptions."""
    with open(filename, 'r') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            desc = row['Transaction Description']
            trans_type = row['Transaction Type']
            parsed = parse_transaction_description(desc, trans_type)
            
            print(f"\nOriginal Description: {desc}")
            print(f"Transaction Type: {trans_type}")
            print(f"Name: {parsed['name']}")
            print(f"Reference: {parsed['reference']}")
            print("-" * 80)

if __name__ == "__main__":
    # Process the transactions
    process_transactions('transactions.csv')
