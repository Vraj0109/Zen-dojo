import bisect
from collections import defaultdict

class TimeMap:
    def __init__(self):
        self.data = defaultdict(list)

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.data[key].append((timestamp, value))

    def get(self, key: str, timestamp: int) -> str:
        v = self.data.get(key)
        if not v:
            return ""
        idx = bisect.bisect_right(v, timestamp, key=lambda x: x[0])
        return "" if idx == 0 else v[idx - 1][1]
