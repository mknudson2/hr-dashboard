"""
EEO Classification Service
Automatically classifies employees into EEO-1 job categories based on their position/title
"""
import re
from typing import Optional, Dict, List


# EEO-1 Job Categories with detailed keyword mappings
EEO_JOB_CATEGORY_MAPPINGS = {
    "Executive/Senior Officials and Managers": {
        "keywords": [
            "chief", "ceo", "cfo", "cto", "cio", "coo", "president", "vice president", "vp",
            "executive", "director", "senior director", "head of", "managing director"
        ],
        "exact_matches": [
            "CEO", "CFO", "CTO", "CIO", "COO", "President", "Vice President"
        ],
        "description": "Top-level executives and senior managers"
    },

    "First/Mid Officials and Managers": {
        "keywords": [
            "manager", "senior manager", "team lead", "lead", "supervisor", "coordinator",
            "associate director", "assistant director", "department manager", "operations manager",
            "project manager", "program manager", "product manager", "general manager"
        ],
        "exact_matches": [],
        "description": "Mid-level managers and supervisors"
    },

    "Professionals": {
        "keywords": [
            "engineer", "developer", "architect", "scientist", "analyst", "accountant",
            "lawyer", "attorney", "consultant", "designer", "researcher", "pharmacist",
            "nurse practitioner", "physician", "doctor", "specialist", "technologist",
            "administrator", "coordinator", "planner", "strategist", "auditor"
        ],
        "exact_matches": [
            "Software Engineer", "Data Scientist", "Business Analyst", "Accountant",
            "HR Specialist", "Marketing Specialist", "Financial Analyst"
        ],
        "description": "Professional occupations requiring bachelor's degree or higher"
    },

    "Technicians": {
        "keywords": [
            "technician", "tech", "mechanic", "installer", "operator", "machinist",
            "electrician", "it support", "help desk", "support specialist", "maintenance",
            "quality control", "lab tech", "medical tech"
        ],
        "exact_matches": [
            "IT Support Specialist", "Network Technician", "Lab Technician"
        ],
        "description": "Technical support and skilled trades"
    },

    "Sales Workers": {
        "keywords": [
            "sales", "account executive", "business development", "sales representative",
            "account manager", "sales associate", "retail", "cashier", "salesperson",
            "sales engineer"
        ],
        "exact_matches": [
            "Sales Representative", "Account Executive", "Sales Associate"
        ],
        "description": "Sales and related occupations"
    },

    "Administrative Support": {
        "keywords": [
            "administrative", "admin", "assistant", "secretary", "receptionist", "clerk",
            "office", "coordinator", "scheduler", "data entry", "bookkeeper", "payroll",
            "hr assistant", "executive assistant"
        ],
        "exact_matches": [
            "Administrative Assistant", "Office Manager", "Receptionist", "Secretary"
        ],
        "description": "Office and administrative support"
    },

    "Craft Workers": {
        "keywords": [
            "carpenter", "plumber", "welder", "electrician", "mason", "painter",
            "construction", "craftsman", "tradesman", "hvac", "millwright"
        ],
        "exact_matches": [],
        "description": "Skilled construction and extraction trades"
    },

    "Operatives": {
        "keywords": [
            "assembler", "fabricator", "machine operator", "production", "manufacturing",
            "warehouse", "driver", "forklift", "packer", "sorter", "inspector"
        ],
        "exact_matches": [],
        "description": "Semi-skilled production and transportation workers"
    },

    "Laborers and Helpers": {
        "keywords": [
            "laborer", "helper", "loader", "material handler", "stock", "janitor",
            "cleaner", "groundskeeper", "mover", "hand packer"
        ],
        "exact_matches": [],
        "description": "Unskilled manual labor"
    },

    "Service Workers": {
        "keywords": [
            "food service", "cook", "chef", "server", "waiter", "waitress", "bartender",
            "custodian", "security guard", "guard", "housekeeper", "caretaker",
            "customer service", "call center"
        ],
        "exact_matches": [
            "Customer Service Representative", "Security Guard"
        ],
        "description": "Service occupations"
    }
}


class EEOClassificationService:
    """Service for automatically classifying employees into EEO job categories"""

    @staticmethod
    def normalize_text(text: str) -> str:
        """Normalize text for comparison"""
        if not text:
            return ""
        return text.lower().strip()

    @staticmethod
    def classify_position(position: str, department: str = None) -> Optional[str]:
        """
        Automatically classify a position into an EEO-1 job category

        Args:
            position: Job title/position
            department: Optional department for context

        Returns:
            EEO-1 job category or None if no match found
        """
        if not position:
            return None

        position_normalized = EEOClassificationService.normalize_text(position)

        # First, try exact matches (case-insensitive)
        for category, mapping in EEO_JOB_CATEGORY_MAPPINGS.items():
            for exact_match in mapping["exact_matches"]:
                if position_normalized == EEOClassificationService.normalize_text(exact_match):
                    return category

        # Then, try keyword matching with scoring
        scores = {}
        for category, mapping in EEO_JOB_CATEGORY_MAPPINGS.items():
            score = 0
            for keyword in mapping["keywords"]:
                keyword_normalized = EEOClassificationService.normalize_text(keyword)
                # Check if keyword appears in position
                if keyword_normalized in position_normalized:
                    # Longer keywords get higher scores
                    score += len(keyword_normalized)
                    # Exact word boundary match gets bonus
                    if re.search(r'\b' + re.escape(keyword_normalized) + r'\b', position_normalized):
                        score += 10

            if score > 0:
                scores[category] = score

        # Return category with highest score
        if scores:
            best_category = max(scores.items(), key=lambda x: x[1])
            return best_category[0]

        # Default fallback based on common patterns
        if any(word in position_normalized for word in ["intern", "trainee", "apprentice"]):
            return "Professionals"  # Educational/training positions

        return None

    @staticmethod
    def get_classification_confidence(position: str) -> Dict[str, float]:
        """
        Get confidence scores for all possible EEO classifications

        Returns:
            Dictionary mapping categories to confidence scores (0-100)
        """
        if not position:
            return {}

        position_normalized = EEOClassificationService.normalize_text(position)
        scores = {}
        max_score = 0

        for category, mapping in EEO_JOB_CATEGORY_MAPPINGS.items():
            score = 0

            # Exact match = very high confidence
            for exact_match in mapping["exact_matches"]:
                if position_normalized == EEOClassificationService.normalize_text(exact_match):
                    score = 100
                    break

            # Keyword matching
            if score == 0:
                for keyword in mapping["keywords"]:
                    keyword_normalized = EEOClassificationService.normalize_text(keyword)
                    if keyword_normalized in position_normalized:
                        score += len(keyword_normalized) * 2
                        if re.search(r'\b' + re.escape(keyword_normalized) + r'\b', position_normalized):
                            score += 20

            scores[category] = score
            max_score = max(max_score, score)

        # Normalize scores to 0-100 scale
        if max_score > 0:
            normalized_scores = {
                category: min(100, (score / max_score) * 100)
                for category, score in scores.items()
                if score > 0
            }
            return normalized_scores

        return {}

    @staticmethod
    def get_suggestions(position: str, top_n: int = 3) -> List[Dict[str, any]]:
        """
        Get top N EEO category suggestions with confidence scores

        Returns:
            List of dictionaries with 'category', 'confidence', and 'description'
        """
        confidence_scores = EEOClassificationService.get_classification_confidence(position)

        # Sort by confidence
        sorted_suggestions = sorted(
            confidence_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:top_n]

        return [
            {
                "category": category,
                "confidence": round(confidence, 1),
                "description": EEO_JOB_CATEGORY_MAPPINGS[category]["description"]
            }
            for category, confidence in sorted_suggestions
        ]

    @staticmethod
    def get_all_mappings() -> Dict[str, Dict]:
        """Get all EEO category mappings for reference"""
        return EEO_JOB_CATEGORY_MAPPINGS
