class TimeMap:
    def __init__(self):
        self.entries = []  # list of (key, value, timestamp)

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.entries.append((key, value, timestamp))

    def get(self, key: str, timestamp: int) -> str:
        res = ""
        best_time = -1
        for k, v, t in self.entries:
            if k == key and t <= timestamp:
                if t > best_time:
                    best_time = t
                    res = v
        return res
