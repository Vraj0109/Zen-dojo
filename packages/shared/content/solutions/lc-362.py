from collections import deque

class HitCounter:
    def __init__(self):
        self.q = deque()

    def hit(self, timestamp: int) -> None:
        self.q.append(timestamp)

    def getHits(self, timestamp: int) -> int:
        cutoff = timestamp - 300
        while self.q and self.q[0] <= cutoff:
            self.q.popleft()
        return len(self.q)
