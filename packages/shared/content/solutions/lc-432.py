class AllOne:
    def __init__(self):
        self.count = {}
        self.by_count = {}

    def _move(self, key: str, from_c: int, to_c: int) -> None:
        if from_c > 0:
            self.by_count[from_c].remove(key)
            if not self.by_count[from_c]:
                del self.by_count[from_c]
        if to_c > 0:
            if to_c not in self.by_count:
                self.by_count[to_c] = set()
            self.by_count[to_c].add(key)
            self.count[key] = to_c
        else:
            del self.count[key]

    def inc(self, key: str) -> None:
        c = self.count.get(key, 0)
        self._move(key, c, c + 1)

    def dec(self, key: str) -> None:
        c = self.count[key]
        self._move(key, c, c - 1)

    def getMaxKey(self) -> str:
        if not self.by_count:
            return ""
        max_c = max(self.by_count)
        return next(iter(self.by_count[max_c]))

    def getMinKey(self) -> str:
        if not self.by_count:
            return ""
        min_c = min(self.by_count)
        return next(iter(self.by_count[min_c]))
