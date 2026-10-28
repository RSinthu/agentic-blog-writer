import logging
import sys
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

APP_LOGGER = "app"  # every module logs under app.* via get_logger(__name__)
LOG_FORMAT = "%(asctime)s %(levelname)-7s %(name)s: %(message)s"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    openai_api_key: str = ""
    openai_model: str = "gpt-5-mini"
    tavily_api_key: str = ""
    enable_images: bool = False
    frontend_origin: str = "http://localhost:3000"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def setup_logging() -> None:
    """Configure the "app" logger once. Leaves the root logger (and uvicorn's loggers) alone."""
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt="%H:%M:%S"))

    logger = logging.getLogger(APP_LOGGER)
    logger.setLevel(get_settings().log_level)
    logger.addHandler(handler)
    logger.propagate = False  # don't print twice if something else configures root


def get_logger(name: str) -> logging.Logger:
    """Use as: logger = get_logger(__name__)"""
    setup_logging()
    return logging.getLogger(name)
