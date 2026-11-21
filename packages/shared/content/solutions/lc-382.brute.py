import random

class Solution:
    def __init__(self, head: ListNode):
        self.vals = []
        cur = head
        while cur:
            self.vals.append(cur.val)
            cur = cur.next

    def getRandom(self) -> int:
        return random.choice(self.vals)
