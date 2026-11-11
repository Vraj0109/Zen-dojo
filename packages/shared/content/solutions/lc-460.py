from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.min_count = 0
        self.key_to_val = {}
        self.key_to_count = {}
        self.count_to_keys = defaultdict(OrderedDict)

    def _touch(self, key: int) -> None:
        cnt = self.key_to_count[key]
        del self.count_to_keys[cnt][key]
        if not self.count_to_keys[cnt]:
            del self.count_to_keys[cnt]
            if self.min_count == cnt:
                self.min_count += 1
        self.key_to_count[key] = cnt + 1
        self.count_to_keys[cnt + 1][key] = True

    def get(self, key: int) -> int:
        if key not in self.key_to_val:
            return -1
        self._touch(key)
        return self.key_to_val[key]

    def put(self, key: int, value: int) -> None:
        if self.cap == 0:
            return
        if key in self.key_to_val:
            self.key_to_val[key] = value
            self._touch(key)
            return
        if len(self.key_to_val) == self.cap:
            oldest_key, _ = self.count_to_keys[self.min_count].popitem(last=False)
            del self.key_to_val[oldest_key]
            del self.key_to_count[oldest_key]
            if not self.count_to_keys[self.min_count]:
                del self.count_to_keys[self.min_count]
        self.key_to_val[key] = value
        self.key_to_count[key] = 1
        self.count_to_keys[1][key] = True
        self.min_count = 1
