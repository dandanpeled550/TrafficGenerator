import logging
import os

LOGS_DIR = os.environ.get('LOGS_DIR', '/tmp/logs')
os.makedirs(LOGS_DIR, exist_ok=True)
LOG_FILE_PATH = os.path.join(LOGS_DIR, 'campaign_events.log')

# Create a formatter
formatter = logging.Formatter('%(asctime)s %(levelname)s: %(message)s')

def get_logger(name: str = None):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    # Avoid adding handlers multiple times
    if not logger.handlers:
        # File handler
        file_handler = logging.FileHandler(LOG_FILE_PATH)
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.INFO)
        logger.addHandler(file_handler)
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        console_handler.setLevel(logging.INFO)
        logger.addHandler(console_handler)
    return logger 