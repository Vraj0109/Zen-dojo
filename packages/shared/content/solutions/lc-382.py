import random
from typing import Optional

class Solution:
    def __init__(self, head: Optional[ListNode]):
        self.head = head

    def getRandom(self) -> int:
        ans = self.head.val
        curr = self.head.next
        i = 2
        while curr:
            if random.randrange(i) == 0:
                ans = curr.val
            curr = curr.next
            i += 1
        return ans
