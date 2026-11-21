class Bucket:
    def __init__(self, count: int):
        self.count = count
        self.keys = set()
        self.prev = None
        self.next = None

class AllOne:
    def __init__(self):
        self.key_to_bucket = {}
        self.head = Bucket(0)
        self.tail = Bucket(0)
        self.head.next = self.tail
        self.tail.prev = self.head

    def _insert_after(self, prev_node: Bucket, count: int) -> Bucket:
        b = Bucket(count)
        b.next = prev_node.next
        b.prev = prev_node
        prev_node.next.prev = b
        prev_node.next = b
        return b

    def _remove_bucket(self, b: Bucket) -> None:
        b.prev.next = b.next
        b.next.prev = b.prev

    def inc(self, key: str) -> None:
        if key not in self.key_to_bucket:
            first = self.head.next
            if first == self.tail or first.count != 1:
                first = self._insert_after(self.head, 1)
            first.keys.add(key)
            self.key_to_bucket[key] = first
        else:
            cur = self.key_to_bucket[key]
            nxt = cur.next
            if nxt == self.tail or nxt.count != cur.count + 1:
                nxt = self._insert_after(cur, cur.count + 1)
            nxt.keys.add(key)
            self.key_to_bucket[key] = nxt
            cur.keys.remove(key)
            if not cur.keys:
                self._remove_bucket(cur)

    def dec(self, key: str) -> None:
        if key not in self.key_to_bucket:
            return
        cur = self.key_to_bucket[key]
        if cur.count == 1:
            del self.key_to_bucket[key]
        else:
            prv = cur.prev
            if prv == self.head or prv.count != cur.count - 1:
                prv = self._insert_after(cur.prev, cur.count - 1)
            prv.keys.add(key)
            self.key_to_bucket[key] = prv
        cur.keys.remove(key)
        if not cur.keys:
            self._remove_bucket(cur)

    def getMaxKey(self) -> str:
        if self.tail.prev == self.head:
            return ""
        return next(iter(self.tail.prev.keys))

    def getMinKey(self) -> str:
        if self.head.next == self.tail:
            return ""
        return next(iter(self.head.next.keys))
