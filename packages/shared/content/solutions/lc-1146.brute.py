class SnapshotArray:
    def __init__(self, length: int):
        self.current = [0] * length
        self.snapshots = []

    def set(self, index: int, val: int) -> None:
        self.current[index] = val

    def snap(self) -> int:
        self.snapshots.append(list(self.current))
        return len(self.snapshots) - 1

    def get(self, index: int, snap_id: int) -> int:
        return self.snapshots[snap_id][index]
