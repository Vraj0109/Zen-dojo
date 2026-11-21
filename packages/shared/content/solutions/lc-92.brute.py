from typing import Optional

class Solution:
    def reverseBetween(self, head: Optional[ListNode], left: int, right: int) -> Optional[ListNode]:
        vals = []
        curr = head
        while curr:
            vals.append(curr.val)
            curr = curr.next
        vals[left - 1 : right] = reversed(vals[left - 1 : right])
        curr = head
        for v in vals:
            curr.val = v
            curr = curr.next
        return head
