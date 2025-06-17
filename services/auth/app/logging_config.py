import logging
import sys
from pythonjsonlogger.json import JsonFormatter

def setup_logging():
    """
    Configures root logger to output JSON formatted logs to stdout.
    """
    log_handler = logging.StreamHandler(sys.stdout)
    formatter = JsonFormatter(
        fmt='%(asctime)s %(levelname)s %(name)s %(message)s'
    )
    log_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers = [log_handler]
    root_logger.propagate = False
