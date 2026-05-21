"""
Kafka Producer
--------------
ML analysis results ko scan-results topic pe publish karo.
"""

import json
from confluent_kafka import Producer
from src.utils.logger import get_logger

logger = get_logger("kafka_producer")


class ScanResultProducer:
    def __init__(self, broker: str):
        self._producer = Producer({"bootstrap.servers": broker})
        self._topic    = "scan-results"
        logger.info(f"Producer connected to broker: {broker}")

    def publish(self, result: dict) -> None:
        """
        Result dict ko Kafka pe publish karo.
        """
        try:
            self._producer.produce(
                topic     = self._topic,
                key       = result.get("job_id", "unknown"),
                value     = json.dumps(result),
                callback  = self._delivery_report
            )
            self._producer.flush()
            logger.info(f"Published result | job_id={result.get('job_id')}")
        except Exception as e:
            logger.error(f"Failed to publish result: {e}")
            raise

    def _delivery_report(self, err, msg):
        if err:
            logger.error(f"Delivery failed: {err}")
        else:
            logger.info(
                f"Delivered to {msg.topic()} "
                f"[partition={msg.partition()}, offset={msg.offset()}]"
            )
