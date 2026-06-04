from typing import List, Dict, Any

class PIIMasker: 
    """
    Applies role-based redaction and masking rules to columns containing 
    Personally Identifiable Information (PII) returned from the database.
    """

    @staticmethod
    def mask_email(email: str) -> str: 
        """Partially obfuscates an email address."""
        if not email or "@" not in email: 
            return email
        
        local_part, domain = email.split("@", 1)
        if len(local_part) <= 2:
            return f"{local_part[0]}***@{domain}"
        
        return f"{local_part[0]}***{local_part[-1]}@{domain}"
    
    @staticmethod
    def mask_phone(phone: str) -> str: 
        """Partially obfuscates a phone or fax number."""
        if not phone: 
            return phone
        
        if len(phone) > 4: 
            return f"{phone[:-4]}XXXX"
        
        return "XXXX-XXXX"
    
    @classmethod
    def mask_record(cls, record: Dict[str, Any], role: str) -> Dict[str, Any]:
        """
        Masks sensitive keys in a single record dictionary based on role clearance.
        Clearance levels: 'admin', 'analyst', 'general'.
        """

        role = role.lower().strip()
        if role == "admin": 
            return record 

        masked_record = record.copy()

        sensitive_email_keys = {"email"}
        sensitive_phone_keys = {"phone", "fax"}
        sensitive_address_keys = {"address", "postalcode"}

        for key, val in masked_record.items(): 
            key_lower = key.lower()
            if val is None: 
                continue
                
            val_str = str(val)

            if key_lower in sensitive_email_keys:
                if role == "general":
                    masked_record[key] = "[REDACTED]"
                elif role == "analyst":
                    masked_record[key] = cls.mask_email(val_str)
            
            elif key_lower in sensitive_phone_keys:
                if role == "general":
                    masked_record[key] = "[REDACTED]"
                elif role == "analyst":
                    masked_record[key] = cls.mask_phone(val_str)
            
            elif key_lower in sensitive_address_keys:
                if role == "general":
                    masked_record[key] = "[REDACTED]"

        return masked_record
    
    @classmethod
    def mask_dataset(cls, dataset: List[Dict[str, Any]], role: str) -> List[Dict[str, Any]]: 
        """
        Applies masking rules to an entire dataset (list of dictionaries).
        """

        if not dataset: 
            return dataset
        
        return [cls.mask_record(row, role) for row in dataset]