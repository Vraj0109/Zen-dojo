class AllOne:
    def __init__(self):
        self.counts = {}

    def inc(self, key: str) -> None:
        self.counts[key] = self.counts.get(key, 0) + 1

    def dec(self, key: str) -> None:
        self.counts[key] -= 1
        if self.counts[key] == 0:
            del self.counts[key]

    def getMaxKey(self) -> str:
        if not self.counts:
            return ""
        max_val = max(self.counts.values())
        for k, v in self.counts.items():
            if v == max_val:
                return k
        return ""

    def getMinKey(self) -> str:
        if not self.counts:
            return ""
        min_val = min(self.counts.values())
        for k, v in self.counts.items():
            if v == min_val:
                return k
        return ""
