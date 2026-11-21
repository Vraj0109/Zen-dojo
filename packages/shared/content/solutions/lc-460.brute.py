class LFUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.timer = 0
        self.data = []  # list of [key, value, freq, time]

    def get(self, key: int) -> int:
        if self.cap == 0:
            return -1
        self.timer += 1
        for entry in self.data:
            if entry[0] == key:
                entry[2] += 1
                entry[3] = self.timer
                return entry[1]
        return -1

    def put(self, key: int, value: int) -> None:
        if self.cap == 0:
            return
        self.timer += 1
        for entry in self.data:
            if entry[0] == key:
                entry[1] = value
                entry[2] += 1
                entry[3] = self.timer
                return
        if len(self.data) == self.cap:
            victim_idx = 0
            for i in range(1, len(self.data)):
                cur = self.data[i]
                best = self.data[victim_idx]
                if cur[2] < best[2] or (cur[2] == best[2] and cur[3] < best[3]):
                    victim_idx = i
            self.data.pop(victim_idx)
        self.data.append([key, value, 1, self.timer])
