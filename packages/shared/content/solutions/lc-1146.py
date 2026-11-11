import bisect

class SnapshotArray:
    def __init__(self, length: int):
        self.history = [[(0, 0)] for _ in range(length)]
        self.snaps = 0

    def set(self, index: int, val: int) -> None:
        h = self.history[index]
        if h[-1][0] == self.snaps:
            h[-1] = (self.snaps, val)
        else:
            h.append((self.snaps, val))

    def snap(self) -> int:
        cur = self.snaps
        self.snaps += 1
        return cur

    def get(self, index: int, snap_id: int) -> int:
        h = self.history[index]
        idx = bisect.bisect_right(h, snap_id, key=lambda x: x[0])
        return h[idx - 1][1]
