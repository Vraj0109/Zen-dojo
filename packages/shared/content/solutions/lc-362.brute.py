class HitCounter:
    def __init__(self):
        self.hits = []

    def hit(self, timestamp: int) -> None:
        self.hits.append(timestamp)

    def getHits(self, timestamp: int) -> int:
        cnt = 0
        for t in self.hits:
            if timestamp - 300 < t <= timestamp:
                cnt += 1
        return cnt
