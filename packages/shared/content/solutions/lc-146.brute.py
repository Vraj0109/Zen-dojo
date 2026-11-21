class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.timer = 0
        self.data = []  # list of [key, value, time]

    def get(self, key: int) -> int:
        self.timer += 1
        for entry in self.data:
            if entry[0] == key:
                entry[2] = self.timer
                return entry[1]
        return -1

    def put(self, key: int, value: int) -> None:
        self.timer += 1
        for entry in self.data:
            if entry[0] == key:
                entry[1] = value
                entry[2] = self.timer
                return
        if len(self.data) == self.cap:
            oldest_idx = 0
            for i in range(1, len(self.data)):
                if self.data[i][2] < self.data[oldest_idx][2]:
                    oldest_idx = i
            self.data.pop(oldest_idx)
        self.data.append([key, value, self.timer])
