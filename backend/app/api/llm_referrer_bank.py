import os
import logging
from typing import List
import re

import openai

# Configure logging
logger = logging.getLogger("llm_referrer_bank")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter('[LLM_REFERRER] %(asctime)s %(levelname)s: %(message)s')
handler.setFormatter(formatter)
if not logger.hasHandlers():
    logger.addHandler(handler)

# Default fallback URLs
DEFAULT_REFERRERS = [f"https://defaultreferrer.com/page/{i}" for i in range(1, 5)]

# Set your OpenAI API key in the environment
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

PROMPT_TEMPLATE = (
    "Give me a list of 4 realistic, diverse URLs of popular websites or articles that can be used as referres to traffic of pepole that  intresets are {interest} in {country}. "
    "Only return the URLs as a plain list, one per line, no extra text."
)

def estimate_token_count(prompt: str) -> int:
    """
    Estimate the number of tokens in the prompt using a simple heuristic:
    1 token ≈ 4 characters (OpenAI's rough estimate for English text).
    """
    return max(1, len(prompt) // 4)

def extract_urls(text: str) -> list[str]:
    """
    Extract all http/https URLs from the given text using regex.
    """
    url_pattern = r'(https?://[^\s]+)'
    return re.findall(url_pattern, text)

def get_referrers(interest: str, country: str) -> List[str]:
    logger.info(f"Requesting LLM referrers for interest='{interest}', country='{country}'")
    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY not set. Returning default referrers.")
        return DEFAULT_REFERRERS
    prompt = PROMPT_TEMPLATE.format(interest=interest, country=country)
    token_estimate = estimate_token_count(prompt)
    logger.info(f"Estimated token count for prompt: {token_estimate} (1 token ≈ 4 characters)")
    try:
        logger.info(f"Sending prompt to OpenAI: {prompt}")
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.9,
            n=1
        )
        logger.info(f"Raw LLM response: {response}")
        content = response.choices[0].message.content
        logger.info(f"LLM content: {content[:200]}... (truncated)")
        # Use regex to extract URLs from the response
        urls = extract_urls(content)
        logger.info(f"Parsed {len(urls)} URLs from LLM response.")
        if len(urls) < 4:
            logger.warning(f"LLM returned fewer than 4 URLs. Falling back to default.")
            return DEFAULT_REFERRERS
        return urls[:4]
    except Exception as e:
        logger.error(f"Error during LLM referrer generation: {e}", exc_info=True)
        return DEFAULT_REFERRERS 