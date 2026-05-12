import sys
import os
from loguru import logger

def setup_logger(log_dir="./logs"):
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
        
    # Remove default handler
    logger.remove()
    
    # Add console handler
    logger.add(
        sys.stderr, 
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="INFO"
    )
    
    # Add file handler with rotation
    logger.add(
        os.path.join(log_dir, "app.log"),
        rotation="10 MB",
        retention="1 month",
        compression="zip",
        level="DEBUG",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}"
    )

    return logger

# Initialize logger
app_logger = setup_logger()
