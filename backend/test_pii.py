from app.core.pii_masker import PIIMasker

def main():
    print("==================================================")
    print("          TESTING ROLE-BASED PII MASKING          ")
    print("==================================================")

    # Sample raw record returned from Chinook Customer Database
    sample_dataset = [
        {
            "CustomerId": 1,
            "FirstName": "Luís",
            "LastName": "Gonçalves",
            "Company": "Embraer - Empresa Brasileira de Aeronáutica S.A.",
            "Address": "Av. Brigadeiro Faria Lima, 2170",
            "City": "São José dos Campos",
            "State": "SP",
            "Country": "Brazil",
            "PostalCode": "12227-000",
            "Phone": "+55 (12) 3923-5555",
            "Fax": "+55 (12) 3923-5566",
            "Email": "luisg@embraer.com.br",
            "SupportRepId": 3
        }
    ]

    print("\n--- 1. Raw Database Record (Admin/Developer view) ---")
    for row in sample_dataset:
        print(f"Email: {row['Email']}")
        print(f"Phone: {row['Phone']}")
        print(f"Fax  : {row['Fax']}")
        print(f"Addr : {row['Address']} ({row['PostalCode']})")

    # Test Analyst Role (Partial Masking)
    print("\n--- 2. Analyst View (Masked contact, unmasked location) ---")
    analyst_view = PIIMasker.mask_dataset(sample_dataset, role="analyst")
    for row in analyst_view:
        print(f"Email: {row['Email']}  (Expected: l***g@embraer.com.br)")
        print(f"Phone: {row['Phone']}  (Expected: +55 (12) 3923-XXXX)")
        print(f"Fax  : {row['Fax']}  (Expected: +55 (12) 3923-XXXX)")
        print(f"Addr : {row['Address']} ({row['PostalCode']})")

    # Test General Role (Complete Redaction)
    print("\n--- 3. General Staff View (Fully Redacted PII fields) ---")
    general_view = PIIMasker.mask_dataset(sample_dataset, role="general")
    for row in general_view:
        print(f"Email: {row['Email']}  (Expected: [REDACTED])")
        print(f"Phone: {row['Phone']}  (Expected: [REDACTED])")
        print(f"Fax  : {row['Fax']}  (Expected: [REDACTED])")
        print(f"Addr : {row['Address']} ({row['PostalCode']})  (Expected: [REDACTED] ([REDACTED]))")

    print("\n==================================================")

if __name__ == "__main__":
    main()
