import re
from typing import Dict, Optional, Tuple

class FirMappingService:
    """
    Intelligently maps incoming emails to FIR numbers based on subject, body, and attachments.
    """
    
    FIR_REGEX = r"FIR-?\d{4}-?\d+"
    ACK_REGEX = r"ACK-?\d+"

    @staticmethod
    def extract_fir_number(text: str) -> Optional[str]:
        """Extracts FIR number from text using regex."""
        if not text:
            return None
        match = re.search(FirMappingService.FIR_REGEX, text, re.IGNORECASE)
        return match.group(0).upper() if match else None

    @staticmethod
    def extract_ack_number(text: str) -> Optional[str]:
        """Extracts Acknowledgement number from text using regex."""
        if not text:
            return None
        match = re.search(FirMappingService.ACK_REGEX, text, re.IGNORECASE)
        return match.group(0).upper() if match else None

    @staticmethod
    def evaluate_mapping(subject: str, body: str, attachment_names: list) -> Tuple[Optional[str], Optional[str], int]:
        """
        Evaluates text to find FIR and ACK numbers, returning them along with a confidence score.
        Score: 100 if in subject, 80 if in body, 60 if in attachment names.
        """
        fir_num = None
        ack_num = None
        confidence = 0

        # Check Subject (Highest Confidence)
        fir_num = FirMappingService.extract_fir_number(subject)
        if fir_num:
            confidence = 100
        else:
            # Check Body
            fir_num = FirMappingService.extract_fir_number(body)
            if fir_num:
                confidence = 80
            else:
                # Check Attachments
                for name in attachment_names:
                    fir_num = FirMappingService.extract_fir_number(name)
                    if fir_num:
                        confidence = 60
                        break

        # Check Ack separately (same logic could apply)
        ack_num = FirMappingService.extract_ack_number(subject) or FirMappingService.extract_ack_number(body)

        return fir_num, ack_num, confidence
