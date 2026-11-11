import random

class RandomizedSet:
    def __init__(self):
        self.items = []
        self.where = {}

    def insert(self, val: int) -> bool:
        if val in self.where:
            return False
        self.where[val] = len(self.items)
        self.items.append(val)
        return True

    def remove(self, val: int) -> bool:
        if val not in self.where:
            return False
        idx = self.where[val]
        last = self.items[-1]
        self.items[idx] = last
        self.where[last] = idx
        self.items.pop()
        del self.where[val]
        return True

    def getRandom(self) -> int:
        return random.choice(self.items)
