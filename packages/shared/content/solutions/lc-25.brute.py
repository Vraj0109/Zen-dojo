from typing import Optional

class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        vals = []
        curr = head
        while curr:
            vals.append(curr.val)
            curr = curr.next
        n = len(vals)
        for i in range(0, n - k + 1, k):
            vals[i : i + k] = reversed(vals[i : i + k])
        curr = head
        for v in vals:
            curr.val = v
            curr = curr.next
        return head
