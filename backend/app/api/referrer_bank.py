# Static referrer bank for (interest, country) pairs

from typing import List

# Example: Only a few pairs for demo; in real use, fill with 100 URLs each
STATIC_REFERRERS = {
    ("sports", "United States"): [
        f"https://sportsusa.com/article/{i}" for i in range(1, 101)
    ],
    ("technology", "Germany"): [
        f"https://techde.de/news/{i}" for i in range(1, 101)
    ],
    ("fashion", "France"): [
        f"https://modefr.fr/look/{i}" for i in range(1, 101)
    ],
    # Add more (interest, country) pairs as needed
}

DEFAULT_REFERRERS = [f"https://defaultreferrer.com/page/{i}" for i in range(1, 101)]

def get_referrers(interest: str, country: str) -> List[str]:
    """
    Return a list of 100 referrer URLs for the given interest and country.
    If not found, return a default list.
    """
    return STATIC_REFERRERS.get((interest, country), DEFAULT_REFERRERS) 